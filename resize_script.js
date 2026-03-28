/**
 * MinuteBytesResize - Automated Pica-Powered Resizing Engine
 * Automatically triggers resizing on input changes with high-performance debouncing.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const originalPreview = document.getElementById('original-preview');
    const resizedPreview = document.getElementById('resized-preview');
    const originalInfoLabel = document.getElementById('original-info-label');
    const resizedInfoLabel = document.getElementById('resized-info-label');
    const resizedContainer = document.getElementById('resized-container');
    const resizedPlaceholder = document.getElementById('resized-placeholder');
    const upscaleWarning = document.getElementById('upscale-warning');
    
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileFormatDisplay = document.getElementById('file-format-display');
    
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const lockBtn = document.getElementById('lock-btn');
    const lockIcon = document.getElementById('lock-icon');
    
    const downloadBtn = document.getElementById('download-btn');
    const newImageBtn = document.getElementById('new-image-btn');
    const clearBtn = document.getElementById('clear-btn');
    const formatBtns = document.querySelectorAll('.format-btn');

    // --- STATE ---
    let originalImage = new Image();
    let originalAspectRatio = 1;
    let isLocked = true;
    let currentFormat = 'image/jpeg';
    let resizedBlob = null;
    let currentPreviewUrl = null;
    let originalFileInfo = { name: '', size: 0, type: '' };
    let resizeTimer = null;

    // --- INITIALIZE PICA ---
    const pica = window.pica();

    // --- AUTOMATED PICA RESAMPLING ENGINE ---

    /**
     * performAutoResize
     * The master function that triggers Pica to update the preview.
     */
    const performAutoResize = async () => {
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);

        if (!targetWidth || !targetHeight || isNaN(targetWidth) || isNaN(targetHeight)) return;

        // Visual feedback (shimmer or opacity)
        resizedContainer.classList.add('opacity-40');

        try {
            // 1. Setup canvases
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = originalImage.naturalWidth;
            sourceCanvas.height = originalImage.naturalHeight;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.drawImage(originalImage, 0, 0);

            const targetCanvas = document.createElement('canvas');
            targetCanvas.width = targetWidth;
            targetCanvas.height = targetHeight;

            // 2. Perform resize with Pica
            await pica.resize(sourceCanvas, targetCanvas, {
                unsharpAmount: 80,
                unsharpRadius: 0.6,
                unsharpThreshold: 2,
                quality: 3,
                alpha: true
            });

            // 3. Final Canvas Processing
            let finalCanvas = targetCanvas;
            if (currentFormat === 'image/jpeg') {
                finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetWidth;
                finalCanvas.height = targetHeight;
                const finalCtx = finalCanvas.getContext('2d');
                finalCtx.fillStyle = '#FFFFFF';
                finalCtx.fillRect(0, 0, targetWidth, targetHeight);
                finalCtx.drawImage(targetCanvas, 0, 0);
            }

            // 4. Export as Blob
            const quality = (currentFormat === 'image/png') ? undefined : 0.95;
            finalCanvas.toBlob((blob) => {
                if (!blob) return;
                resizedBlob = blob;
                const sizeStr = formatSize(blob.size);
                resizedInfoLabel.textContent = `${targetWidth} x ${targetHeight} PX (${sizeStr})`;
                
                // Refresh preview
                if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                currentPreviewUrl = URL.createObjectURL(blob);
                resizedPreview.src = currentPreviewUrl;
                
                resizedPreview.classList.remove('hidden');
                resizedPlaceholder.classList.add('hidden');
                resizedContainer.classList.remove('opacity-50', 'opacity-40');
                
                downloadBtn.disabled = false;
                downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }, currentFormat, quality);

        } catch (e) {
            console.error('Auto-resize processing error:', e);
            resizedContainer.classList.remove('opacity-40');
        }
    };

    /**
     * Debounce helper to prevent excessive CPU usage during typing.
     */
    const triggerDebouncedResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(performAutoResize, 400); // 400ms delay after typing
    };

    // --- INITIALIZATION ---

    const initFromSession = () => {
        const data = sessionStorage.getItem('originalImage');
        const name = sessionStorage.getItem('originalFileName');
        const type = sessionStorage.getItem('originalFileType');
        const size = sessionStorage.getItem('originalFileSize');

        if (!data) {
            window.location.href = '/image-resizer';
            return;
        }

        originalFileInfo = { name, size: parseInt(size), type };
        originalImage.onload = () => {
            originalPreview.src = data;
            fileNameDisplay.textContent = name;
            fileFormatDisplay.textContent = type.split('/')[1].toUpperCase();
            
            originalAspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;
            originalInfoLabel.textContent = `${originalImage.naturalWidth} x ${originalImage.naturalHeight} PX`;
            
            widthInput.value = originalImage.naturalWidth;
            heightInput.value = originalImage.naturalHeight;
            
            const targetBtn = document.querySelector(`.format-btn[data-format="${type}"]`);
            if (targetBtn) targetBtn.click();
            checkUpscale();
            performAutoResize(); // Initial resize
        };
        originalImage.src = data;
    };

    const resetResizedState = () => {
        if (!resizedInfoLabel) return;
        resizedInfoLabel.textContent = '0 x 0 PX';
        resizedPreview.classList.add('hidden');
        resizedPlaceholder.classList.remove('hidden');
        resizedContainer.classList.add('opacity-50');
        downloadBtn.disabled = true;
        downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
    };

    const checkUpscale = () => {
        const tw = parseInt(widthInput.value) || 0;
        if (tw > (originalImage.naturalWidth || 0)) {
            upscaleWarning.classList.remove('hidden');
        } else {
            upscaleWarning.classList.add('hidden');
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // --- EVENT LISTENERS ---

    widthInput.addEventListener('input', () => {
        if (isLocked && widthInput.value) {
            heightInput.value = Math.round(widthInput.value / originalAspectRatio);
        }
        checkUpscale();
        triggerDebouncedResize();
    });

    heightInput.addEventListener('input', () => {
        if (isLocked && heightInput.value) {
            widthInput.value = Math.round(heightInput.value * originalAspectRatio);
        }
        checkUpscale();
        triggerDebouncedResize();
    });

    lockBtn.addEventListener('click', () => {
        isLocked = !isLocked;
        lockIcon.textContent = isLocked ? 'link' : 'link_off';
        lockBtn.classList.toggle('bg-primary', isLocked);
        lockBtn.classList.toggle('bg-outline-variant', !isLocked);
        triggerDebouncedResize();
    });

    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formatBtns.forEach(b => {
                b.classList.remove('bg-secondary-container', 'text-on-secondary-container', 'font-bold');
                b.classList.add('bg-surface-container-highest', 'text-on-surface-variant', 'font-semibold');
            });
            btn.classList.add('bg-secondary-container', 'text-on-secondary-container', 'font-bold');
            currentFormat = btn.dataset.format;
            triggerDebouncedResize();
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!resizedBlob) return;
        const url = URL.createObjectURL(resizedBlob);
        const a = document.createElement('a');
        const ext = currentFormat.split('/')[1].replace('jpeg', 'jpg');
        const originalName = originalFileInfo.name.split('.')[0];
        
        a.href = url;
        a.download = `resized-${originalName}-${widthInput.value}x${heightInput.value}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => { 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url); 
        }, 100);
    });

    const backToUpload = () => {
        sessionStorage.clear();
        window.location.href = '/image-resizer';
    };

    newImageBtn.addEventListener('click', backToUpload);
    clearBtn.addEventListener('click', backToUpload);

    initFromSession();
});
