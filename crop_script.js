/**
 * LuminaCrop - Precision Framing Engine (Upgraded)
 * Built on Cropper.js with professional mouse-drags, aspect ratios, and transformations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const imageElement = document.getElementById('image-to-crop');
    const selectionDisplay = document.getElementById('selection-display');
    const aspectRatioDisplay = document.getElementById('aspect-ratio-display');
    const formatDisplay = document.getElementById('format-display');

    const flipHBtn = document.getElementById('flip-h');

    const downloadBtn = document.getElementById('download-btn');
    const newImageBtn = document.getElementById('new-image-btn');
    const clearBtn = document.getElementById('clear-btn');
    const ratioBtns = document.querySelectorAll('.ratio-btn');

    // --- STATE ---
    let cropper = null;
    let originalFileInfo = { name: '', type: '' };

    // --- HELPERS ---

    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const getSimpleRatio = (w, h) => {
        const commonRatios = {
            '1.00': '1:1',
            '1.78': '16:9',
            '0.56': '9:16',
            '1.33': '4:3',
            '0.75': '3:4',
            '1.50': '3:2',
            '0.67': '2:3',
            '2.33': '21:9',
        };
        const current = (w / h).toFixed(2);
        if (commonRatios[current]) return commonRatios[current];

        const divisor = gcd(w, h);
        return `${w / divisor}:${h / divisor}`;
    };

    // --- CROPPER INITIALIZATION ---

    const initCropper = () => {
        if (!imageElement.src || imageElement.src.includes('window.location.href')) return;

        if (cropper) cropper.destroy();

        if (formatDisplay && originalFileInfo.type) {
            formatDisplay.textContent = originalFileInfo.type.split('/')[1].toUpperCase();
        }

        // --- Pro-grade Cropper.js Configuration for 90° Stability ---
        cropper = new Cropper(imageElement, {
            dragMode: 'crop',          // Enable mouse-drawing
            autoCrop: true,            // Selection on load
            autoCropArea: 1,           // Fill container initially
            initialAspectRatio: NaN,
            
            viewMode: 1,               // CRITICAL: Image must fit container
            responsive: true,          
            restore: false,            // Prevent snap-back bugs after rotation
            
            checkOrientation: true,
            movable: true,
            rotatable: false,          // FEATURE REMOVED: Rotation disabled
            scalable: true,
            zoomable: false,           
            
            guides: true,
            center: true,
            highlight: true,
            background: false,
            
            crop(event) {
                const w = Math.round(event.detail.width);
                const h = Math.round(event.detail.height);
                
                if (selectionDisplay) selectionDisplay.textContent = `${w} × ${h} PX`;
                if (aspectRatioDisplay) aspectRatioDisplay.textContent = getSimpleRatio(w, h);
            }
        });
    };

    const initFromSession = () => {
        const data = sessionStorage.getItem('originalImage');
        const name = sessionStorage.getItem('originalFileName');
        const type = sessionStorage.getItem('originalFileType') || 'image/jpeg';

        if (!data) {
            window.location.href = 'crop_page_upload.html';
            return;
        }

        originalFileInfo = { name, type };

        imageElement.onload = () => {
            initCropper();
        };
        imageElement.src = data;
    };

    // --- EVENT LISTENERS ---

    // Aspect Ratio Toggling
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!cropper) return;

            // UI Styling
            ratioBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20', 'font-black');
                b.classList.add('bg-[#f1f3f4]', 'text-on-surface-variant', 'font-bold');
            });
            btn.classList.add('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20', 'font-black');
            btn.classList.remove('bg-[#f1f3f4]', 'text-on-surface-variant', 'font-bold');

            // Ratio Logic
            const rawRatio = btn.getAttribute('data-ratio');
            const ratioValue = parseFloat(rawRatio);

            // isNaN(ratioValue) handles the "NaN" data attribute for Free Cropping
            cropper.setAspectRatio(isNaN(ratioValue) ? NaN : ratioValue);
        });
    });

    // Transformations
    flipHBtn?.addEventListener('click', () => {
        if (cropper) {
            const currentData = cropper.getData();
            cropper.scaleX(currentData.scaleX === -1 ? 1 : -1);
        }
    });

    // Resetting
    clearBtn?.addEventListener('click', () => {
        if (cropper) {
            cropper.reset();
            cropper.setAspectRatio(NaN);
            const freeBtn = document.querySelector('[data-ratio="NaN"]');
            if (freeBtn) {
                ratioBtns.forEach(b => {
                    b.classList.remove('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20', 'font-black');
                    b.classList.add('bg-[#f1f3f4]', 'text-on-surface-variant', 'font-bold');
                });
                freeBtn.classList.add('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20', 'font-black');
                freeBtn.classList.remove('bg-[#f1f3f4]', 'text-on-surface-variant', 'font-bold');
            }
        }
    });

    newImageBtn?.addEventListener('click', () => {
        if (cropper) cropper.destroy();
        sessionStorage.clear();
        window.location.href = 'crop_page_upload.html';
    });

    // Export Process
    downloadBtn?.addEventListener('click', () => {
        if (!cropper) return;

        // High-Quality Processing Block
        const croppedCanvas = cropper.getCroppedCanvas({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        const mimeType = originalFileInfo.type;
        const quality = 0.95;
        const originalName = originalFileInfo.name ? originalFileInfo.name.split('.')[0] : 'image';
        const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');

        // PNG is lossless in browsers automatically
        const finalQuality = (mimeType === 'image/png') ? undefined : quality;

        croppedCanvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `framed-${originalName}.${ext}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, mimeType, finalQuality);
    });

    initFromSession();
});
