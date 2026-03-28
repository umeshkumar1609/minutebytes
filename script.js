/**
 * MinuteBytes - Stabilized Image Compression Engine
 *
 * Core fixes in this version:
 * 1) GIF previews always use object URLs (never canvas) to preserve animation.
 * 2) GIF compression runs from originalBlob only and waits for gifsicle-wasm.
 * 3) Compression runs are tokenized to avoid stale async updates/race conditions.
 * 4) Auto compression loop is bounded (max 10 attempts) and never returns larger output.
 * 5) Preview URL lifecycle is centralized so each previous URL is revoked exactly once.
 * 6) Canvas reuse is applied for JPEG/PNG/WebP to reduce repeated heavy setup work.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const originalPreview = document.getElementById('original-preview');
    const optimizedPreview = document.getElementById('optimized-preview');
    const originalSizeLabel = document.getElementById('original-size-label');
    const optimizedSizeLabel = document.getElementById('optimized-size-label');
    const optimizedContainer = document.getElementById('optimized-container');
    const optimizedPlaceholder = document.getElementById('optimized-placeholder');
    const compressionTip = document.getElementById('compression-tip');
    const tipText = compressionTip?.querySelector('p');

    const qualitySlider = document.getElementById('quality-slider');
    const qualityDisplay = document.getElementById('quality-display');
    const formatBtns = document.querySelectorAll('.format-btn');
    const gifBtn = document.getElementById('format-gif');
    const downloadBtn = document.getElementById('download-btn');
    const newImageBtn = document.getElementById('new-image-btn');
    const clearBtn = document.getElementById('clear-btn');

    const fileNameDisplay = document.getElementById('file-name-display');
    const fileInfoDisplay = document.getElementById('file-info-display');

    // --- CONSTANTS ---
    const MAX_COMPRESSION_ATTEMPTS = 10;
    const COMPRESSION_DEBOUNCE_MS = 220;
    const GIF_WASM_WAIT_MS = 5000;
    const MIN_QUALITY = 10;
    const GIF_QUALITY_STEP = 10;
    const STANDARD_QUALITY_STEP = 7;

    const FORMAT_EXT = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
    };

    // --- STATE ---
    let originalImage = new Image();
    let currentFormat = 'image/jpeg';
    let optimizedBlob = null;
    let originalBlob = null;
    let originalPreviewUrl = null;
    let optimizedPreviewUrl = null;
    let originalFileInfo = { name: '', size: 0, type: '' };
    let compressTimer = null;
    let activeCompressionRunId = 0;
    let standardCompressionContext = null;
    let canvasSourceLoadPromise = null;

    // --- HELPERS ---
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const clampQuality = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 50;
        return Math.max(MIN_QUALITY, Math.min(100, parsed));
    };

    const formatSize = (bytes) => {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
        return `${val} ${sizes[i]}`;
    };

    const getDisplayType = (mimeType) => {
        const subtype = (mimeType || 'image/jpeg').split('/')[1] || 'jpeg';
        return subtype.toUpperCase().replace('JPEG', 'JPG');
    };

    const setDownloadState = (enabled) => {
        if (!downloadBtn) return;
        downloadBtn.disabled = !enabled;
        downloadBtn.classList.toggle('opacity-50', !enabled);
        downloadBtn.classList.toggle('cursor-not-allowed', !enabled);
    };

    const setCompressionTip = () => {
        if (!compressionTip || !tipText) return;
        if (currentFormat === 'image/png') {
            compressionTip.classList.remove('hidden');
            tipText.innerHTML = '<span class="material-symbols-outlined text-sm">info</span> TIP: PNG uses UPNG color quantization for stronger size reduction';
            return;
        }
        if (currentFormat === 'image/gif') {
            compressionTip.classList.remove('hidden');
            tipText.innerHTML = '<span class="material-symbols-outlined text-sm">info</span> TIP: GIF keeps animation frames via gifsicle-wasm optimization';
            return;
        }
        compressionTip.classList.add('hidden');
    };

    const setActiveFormatButton = (format) => {
        formatBtns.forEach((btn) => {
            btn.classList.remove('bg-secondary-container', 'text-on-secondary-container', 'font-bold');
            btn.classList.add('bg-surface-container-highest', 'text-on-surface-variant', 'font-semibold');
        });
        const activeBtn = document.querySelector(`.format-btn[data-format="${format}"]`);
        if (activeBtn) {
            activeBtn.classList.add('bg-secondary-container', 'text-on-secondary-container', 'font-bold');
            activeBtn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant', 'font-semibold');
        }
    };

    const revokeObjectUrl = (url) => {
        if (!url) return null;
        URL.revokeObjectURL(url);
        return null;
    };

    const setOriginalPreviewFromBlob = (blob) => {
        if (!originalPreview || !blob) return;
        originalPreviewUrl = revokeObjectUrl(originalPreviewUrl);
        originalPreviewUrl = URL.createObjectURL(blob); // GIF-safe preview path
        originalPreview.src = originalPreviewUrl;
        originalPreview.classList.remove('hidden');
    };

    const setOptimizedPreviewFromBlob = (blob) => {
        if (!optimizedPreview || !blob) return;
        optimizedPreviewUrl = revokeObjectUrl(optimizedPreviewUrl);
        optimizedPreviewUrl = URL.createObjectURL(blob); // GIF-safe preview path
        optimizedPreview.src = optimizedPreviewUrl;
    };

    const resetOptimizedState = () => {
        optimizedBlob = null;
        optimizedPreviewUrl = revokeObjectUrl(optimizedPreviewUrl);
        if (optimizedPreview) {
            optimizedPreview.src = '';
            optimizedPreview.classList.add('hidden');
        }
        optimizedPlaceholder?.classList.remove('hidden');
        optimizedContainer?.classList.add('opacity-50');
        optimizedContainer?.classList.remove('opacity-40');
        if (optimizedSizeLabel) optimizedSizeLabel.textContent = '0 KB (0%)';
        setDownloadState(false);
    };

    const setOptimizedLoading = (isLoading) => {
        if (!optimizedContainer) return;
        if (isLoading) {
            optimizedContainer.classList.add('opacity-40');
            optimizedContainer.classList.remove('opacity-50');
        } else {
            optimizedContainer.classList.remove('opacity-40');
        }
    };

    const updateResultLabels = (blob) => {
        const sourceSize = originalBlob?.size || originalFileInfo.size || 0;
        const optimizedSize = blob?.size || 0;
        const savedPercent = sourceSize > 0
            ? Math.max(0, Math.round((1 - (optimizedSize / sourceSize)) * 100))
            : 0;

        if (originalSizeLabel) originalSizeLabel.textContent = formatSize(sourceSize);
        if (optimizedSizeLabel) optimizedSizeLabel.textContent = `${formatSize(optimizedSize)} (${savedPercent}%)`;
    };

    const applyOptimizedBlob = (blob) => {
        if (!blob) return;
        optimizedBlob = blob;
        updateResultLabels(blob);
        setOptimizedPreviewFromBlob(blob);
        optimizedPreview?.classList.remove('hidden');
        optimizedPlaceholder?.classList.add('hidden');
        optimizedContainer?.classList.remove('opacity-50', 'opacity-40');
        setDownloadState(true);
    };

    const clearCompressionTimer = () => {
        if (!compressTimer) return;
        clearTimeout(compressTimer);
        compressTimer = null;
    };

    const stopActiveCompression = () => {
        // Any in-flight async run with an old token is ignored when it resolves.
        activeCompressionRunId += 1;
    };

    const cleanupPreviewUrls = () => {
        originalPreviewUrl = revokeObjectUrl(originalPreviewUrl);
        optimizedPreviewUrl = revokeObjectUrl(optimizedPreviewUrl);
    };

    const resetToUpload = () => {
        clearCompressionTimer();
        stopActiveCompression();
        cleanupPreviewUrls();
        if (originalPreview) originalPreview.src = '';
        if (optimizedPreview) optimizedPreview.src = '';
        sessionStorage.clear();
        window.location.href = '/image-compressor';
    };

    window.addEventListener('beforeunload', () => {
        cleanupPreviewUrls();
    });

    const loadImageFromUrl = (img, src) => new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = src;
    });

    const probeDimensionsFromBlob = async (blob) => {
        const probe = new Image();
        const tempUrl = URL.createObjectURL(blob);
        try {
            await loadImageFromUrl(probe, tempUrl);
            return { width: probe.naturalWidth, height: probe.naturalHeight };
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    };

    const ensureCanvasSourceReady = async () => {
        if (originalImage.complete && originalImage.naturalWidth > 0 && originalImage.naturalHeight > 0) {
            return true;
        }
        if (!originalBlob) return false;

        if (!canvasSourceLoadPromise) {
            canvasSourceLoadPromise = (async () => {
                const tempUrl = URL.createObjectURL(originalBlob);
                try {
                    originalImage = new Image();
                    originalImage.decoding = 'async';
                    await loadImageFromUrl(originalImage, tempUrl);
                    standardCompressionContext = null;
                } finally {
                    URL.revokeObjectURL(tempUrl);
                }
            })();
        }

        await canvasSourceLoadPromise;
        return originalImage.complete && originalImage.naturalWidth > 0 && originalImage.naturalHeight > 0;
    };

    const canvasToBlob = (canvas, type, quality) => {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob || null), type, quality);
        });
    };

    const getStandardCompressionContext = () => {
        if (
            standardCompressionContext
            && standardCompressionContext.width === originalImage.naturalWidth
            && standardCompressionContext.height === originalImage.naturalHeight
        ) {
            return standardCompressionContext;
        }

        const width = originalImage.naturalWidth;
        const height = originalImage.naturalHeight;
        if (!width || !height) return null;

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = width;
        sourceCanvas.height = height;

        const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        if (!sourceCtx) return null;

        sourceCtx.clearRect(0, 0, width, height);
        sourceCtx.drawImage(originalImage, 0, 0, width, height);

        standardCompressionContext = {
            width,
            height,
            sourceCanvas,
            sourceCtx,
            rgbaBuffer: null,
            jpegCanvas: null,
            jpegCtx: null,
        };

        return standardCompressionContext;
    };

    const ensureRgbaBuffer = (context) => {
        if (!context) return null;
        if (context.rgbaBuffer) return context.rgbaBuffer;
        const imageData = context.sourceCtx.getImageData(0, 0, context.width, context.height);
        context.rgbaBuffer = imageData.data.buffer;
        return context.rgbaBuffer;
    };

    const compressStandardOnce = async (format, qualityValue) => {
        const context = getStandardCompressionContext();
        if (!context) return null;

        const boundedQuality = clampQuality(qualityValue);
        const qualityRatio = boundedQuality / 100;

        if (format === 'image/jpeg') {
            if (!context.jpegCanvas || !context.jpegCtx) {
                context.jpegCanvas = document.createElement('canvas');
                context.jpegCanvas.width = context.width;
                context.jpegCanvas.height = context.height;
                context.jpegCtx = context.jpegCanvas.getContext('2d');
            }
            if (!context.jpegCtx) return null;

            context.jpegCtx.clearRect(0, 0, context.width, context.height);
            context.jpegCtx.fillStyle = '#FFFFFF';
            context.jpegCtx.fillRect(0, 0, context.width, context.height);
            context.jpegCtx.drawImage(context.sourceCanvas, 0, 0);
            return canvasToBlob(context.jpegCanvas, 'image/jpeg', qualityRatio);
        }

        if (format === 'image/png') {
            if (typeof UPNG !== 'undefined') {
                try {
                    const rgbaBuffer = ensureRgbaBuffer(context);
                    if (rgbaBuffer) {
                        let colorCount = Math.max(2, Math.round((boundedQuality / 100) * 256));
                        if (boundedQuality === 100) colorCount = 0; // true lossless target
                        const encoded = UPNG.encode([rgbaBuffer], context.width, context.height, colorCount);
                        return new Blob([encoded], { type: 'image/png' });
                    }
                } catch (error) {
                    console.error('UPNG encode failed, falling back to canvas PNG.', error);
                }
            }
            return canvasToBlob(context.sourceCanvas, 'image/png');
        }

        if (format === 'image/webp') {
            return canvasToBlob(context.sourceCanvas, 'image/webp', qualityRatio);
        }

        return canvasToBlob(context.sourceCanvas, format, qualityRatio);
    };

    const waitForGifsicle = async () => {
        const startedAt = Date.now();
        while ((Date.now() - startedAt) < GIF_WASM_WAIT_MS) {
            if (window.gifsicle && typeof window.gifsicle.run === 'function') {
                return window.gifsicle;
            }
            await sleep(100);
        }
        return null;
    };

    const compressGifOnce = async (qualityValue) => {
        if (!originalBlob) return null;

        // GIF path does not depend on Image() decoding; uses originalBlob directly.
        const gifsicleApi = await waitForGifsicle();
        if (!gifsicleApi) {
            console.warn('gifsicle-wasm not ready in time. Falling back to original GIF.');
            return originalBlob;
        }

        const boundedQuality = clampQuality(qualityValue);
        const lossy = Math.max(1, Math.min(200, Math.round((100 - boundedQuality) * 2)));
        const colors = Math.max(16, Math.min(256, Math.round((boundedQuality / 100) * 256)));

        try {
            const results = await gifsicleApi.run({
                input: [{ file: originalBlob, name: 'input.gif' }],
                // /out is required by gifsicle-wasm-browser for exported files.
                command: [`--optimize=2 --lossy=${lossy} --colors ${colors} input.gif -o /out/output.gif`],
            });

            if (Array.isArray(results) && results.length > 0) {
                const gifFile = results.find((file) => /\.gif$/i.test(file.name || '')) || results[0];
                if (gifFile && gifFile.size > 0) {
                    return gifFile;
                }
            }
        } catch (error) {
            console.error('GIF compression failed. Falling back to original GIF.', error);
        }

        return originalBlob;
    };

    const getNextAttemptQuality = (format, currentQuality) => {
        const step = format === 'image/gif' ? GIF_QUALITY_STEP : STANDARD_QUALITY_STEP;
        return Math.max(MIN_QUALITY, currentQuality - step);
    };

    const compressWithBudget = async (format, qualityValue, originalSize, runId) => {
        let attemptQuality = clampQuality(qualityValue);
        let bestBlob = null;

        for (let attempt = 1; attempt <= MAX_COMPRESSION_ATTEMPTS; attempt += 1) {
            if (runId !== activeCompressionRunId) return null;

            let candidate = null;
            if (format === 'image/gif') {
                candidate = await compressGifOnce(attemptQuality);
            } else {
                candidate = await compressStandardOnce(format, attemptQuality);
            }

            if (runId !== activeCompressionRunId) return null;
            if (!candidate) break;

            if (!bestBlob || candidate.size < bestBlob.size) {
                bestBlob = candidate;
            }

            if (candidate.size <= originalSize) {
                return candidate;
            }

            const nextQuality = getNextAttemptQuality(format, attemptQuality);
            if (nextQuality === attemptQuality) break;
            attemptQuality = nextQuality;

            // Yield between attempts so large files do not lock the main thread continuously.
            await sleep(0);
        }

        return bestBlob;
    };

    const performAutoCompression = async () => {
        if (!originalBlob) return;

        const runId = ++activeCompressionRunId;
        setOptimizedLoading(true);
        setDownloadState(false);

        try {
            if (currentFormat !== 'image/gif') {
                const ready = await ensureCanvasSourceReady();
                if (runId !== activeCompressionRunId) return;
                if (!ready) return;
            }

            const sourceSize = originalBlob.size || originalFileInfo.size || 0;
            const requestedQuality = clampQuality(qualitySlider?.value ?? 50);
            let resultBlob = await compressWithBudget(currentFormat, requestedQuality, sourceSize, runId);

            if (runId !== activeCompressionRunId) return;

            // Hard safety rule: never keep output larger than source.
            if (!resultBlob || resultBlob.size > sourceSize) {
                resultBlob = originalBlob;
            }

            applyOptimizedBlob(resultBlob);
        } catch (error) {
            console.error('Compression pipeline failed. Falling back to original.', error);
            if (runId === activeCompressionRunId && originalBlob) {
                applyOptimizedBlob(originalBlob);
            }
        } finally {
            if (runId === activeCompressionRunId) {
                setOptimizedLoading(false);
            }
        }
    };

    const triggerDebouncedCompression = (delay = COMPRESSION_DEBOUNCE_MS) => {
        clearCompressionTimer();
        compressTimer = window.setTimeout(() => {
            performAutoCompression();
        }, Math.max(0, delay));
    };

    // --- INITIALIZATION ---
    const initFromSession = async () => {
        const data = sessionStorage.getItem('originalImage');
        const name = sessionStorage.getItem('originalFileName') || 'image';
        const type = sessionStorage.getItem('originalFileType') || 'image/jpeg';
        const sizeFromSession = Number.parseInt(sessionStorage.getItem('originalFileSize') || '0', 10) || 0;

        if (!data) {
            window.location.href = '/image-compressor';
            return;
        }

        resetOptimizedState();
        if (qualityDisplay && qualitySlider) {
            qualityDisplay.textContent = `${clampQuality(qualitySlider.value)}%`;
        }

        originalFileInfo = { name, size: sizeFromSession, type };
        if (fileNameDisplay) fileNameDisplay.textContent = name;

        const displayType = getDisplayType(type);
        if (fileInfoDisplay) fileInfoDisplay.textContent = `${displayType} - LOADING...`;

        try {
            const response = await fetch(data);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            originalBlob = await response.blob();
        } catch (error) {
            console.error('Failed to restore original blob from session data.', error);
            resetToUpload();
            return;
        }

        if (!originalBlob) {
            resetToUpload();
            return;
        }

        if (!originalFileInfo.size || originalFileInfo.size <= 0) {
            originalFileInfo.size = originalBlob.size;
        }
        if (originalSizeLabel) originalSizeLabel.textContent = formatSize(originalFileInfo.size);

        // FIX: Always use object URL for GIF-safe original preview.
        setOriginalPreviewFromBlob(originalBlob);

        const sourceType = originalFileInfo.type;
        if (sourceType === 'image/gif') {
            gifBtn?.classList.remove('hidden');
            currentFormat = 'image/gif';
        } else {
            gifBtn?.classList.add('hidden');
            const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            currentFormat = supportedTypes.includes(sourceType) ? sourceType : 'image/jpeg';
        }

        setActiveFormatButton(currentFormat);
        setCompressionTip();

        // Dimensions are updated independently so GIF compression never waits on Image loading.
        probeDimensionsFromBlob(originalBlob)
            .then(({ width, height }) => {
                if (fileInfoDisplay) fileInfoDisplay.textContent = `${displayType} - ${width} x ${height} PX`;
            })
            .catch(() => {
                if (fileInfoDisplay) fileInfoDisplay.textContent = `${displayType} - READY`;
            });

        if (sourceType === 'image/gif') {
            // Start GIF compression immediately from originalBlob.
            triggerDebouncedCompression(0);

            // Preload first frame in background to support optional JPG/PNG/WebP switches.
            ensureCanvasSourceReady()
                .then(() => {
                    if (currentFormat !== 'image/gif') {
                        triggerDebouncedCompression(0);
                    }
                })
                .catch(() => {
                    // Keep GIF mode functional even if canvas decoding fails.
                });
            return;
        }

        try {
            await ensureCanvasSourceReady();
        } catch (error) {
            console.error('Unable to initialize canvas source image.', error);
            resetToUpload();
            return;
        }

        triggerDebouncedCompression(0);
    };

    // --- EVENT LISTENERS ---
    if (qualitySlider) {
        qualitySlider.addEventListener('input', () => {
            qualityDisplay.textContent = `${clampQuality(qualitySlider.value)}%`;
            triggerDebouncedCompression();
        });
    }

    formatBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const nextFormat = btn.dataset.format;
            if (!nextFormat) return;
            currentFormat = nextFormat;
            setActiveFormatButton(currentFormat);
            setCompressionTip();
            triggerDebouncedCompression();
        });
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!optimizedBlob) return;

            const url = URL.createObjectURL(optimizedBlob);
            const a = document.createElement('a');
            const mimeType = optimizedBlob.type || currentFormat || 'image/jpeg';
            const ext = FORMAT_EXT[mimeType] || 'img';
            const originalName = (originalFileInfo.name || 'image').split('.')[0];

            a.href = url;
            a.download = `optimized-${originalName}.${ext}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
    }

    if (newImageBtn) newImageBtn.addEventListener('click', resetToUpload);
    if (clearBtn) clearBtn.addEventListener('click', resetToUpload);

    initFromSession();
});
