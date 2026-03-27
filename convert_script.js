/**
 * LuminaConvert - Automated Image Format Transformation Engine
 * Automatically triggers conversion on format selection and handles broader file types.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const originalPreview = document.getElementById('original-preview');
    const convertedPreview = document.getElementById('converted-preview');
    const sourceFormatBadge = document.getElementById('source-format-badge');
    const outputFormatBadge = document.getElementById('output-format-badge');
    const convertedContainer = document.getElementById('converted-container');
    const convertedPlaceholder = document.getElementById('converted-placeholder');
    
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSizeDisplay = document.getElementById('file-size-display');
    
    const formatButtons = document.querySelectorAll('.target-format-btn');
    const downloadBtn = document.getElementById('download-btn');
    const newImageBtn = document.getElementById('new-image-btn');
    const clearBtn = document.getElementById('clear-btn');

    // --- STATE ---
    let originalImage = new Image();
    let currentTargetFormat = 'image/jpeg';
    let convertedBlob = null;
    let currentPreviewUrl = null;
    let originalFileInfo = { name: '', size: 0, type: '' };

    // --- AUTOMATIC CONVERSION ENGINE ---

    /**
     * autoConvert
     * Triggers the conversion process instantly based on state.
     */
    const autoConvert = () => {
        if (!originalImage.naturalWidth) return;

        const can = document.createElement('canvas');
        can.width = originalImage.naturalWidth;
        can.height = originalImage.naturalHeight;
        const ctx = can.getContext('2d');

        // Handle alpha/transparency when converting to non-alpha-ready formats (like JPEG)
        // JPEG/BMP/GIF don't support partial transparency well in this context, so we use white bg.
        const transparentMimes = ['image/png', 'image/webp'];
        if (!transparentMimes.includes(currentTargetFormat)) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, can.width, can.height);
        }

        ctx.drawImage(originalImage, 0, 0);

        const quality = (currentTargetFormat === 'image/png') ? undefined : 0.95;
        
        can.toBlob((blob) => {
            if (!blob) return;
            convertedBlob = blob;
            
            // Cleanup old preview
            if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
            
            currentPreviewUrl = URL.createObjectURL(blob);
            convertedPreview.src = currentPreviewUrl;
            convertedPreview.classList.remove('hidden');
            convertedPlaceholder.classList.add('hidden');
            convertedContainer.classList.remove('opacity-50');
            
            outputFormatBadge.textContent = currentTargetFormat.split('/')[1].toUpperCase();
            
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }, currentTargetFormat, quality);
    };

    // --- INITIALIZATION ---

    const initFromSession = () => {
        const data = sessionStorage.getItem('originalImage');
        const name = sessionStorage.getItem('originalFileName');
        const type = sessionStorage.getItem('originalFileType');
        const size = sessionStorage.getItem('originalFileSize');

        if (!data) {
            window.location.href = 'convert_page_upload.html';
            return;
        }

        originalFileInfo = { name, size: parseInt(size), type };
        originalImage.onload = () => {
            originalPreview.src = data;
            fileNameDisplay.textContent = name;
            fileSizeDisplay.textContent = formatSize(size);
            
            // Detect source format
            const detectedExt = name.split('.').pop().toUpperCase();
            sourceFormatBadge.textContent = detectedExt || (type.split('/')[1] || 'Unknown').toUpperCase();
            
            // Set default target and trigger first conversion
            const defaultTarget = (type === 'image/png') ? 'image/jpeg' : 'image/png';
            const defaultBtn = document.querySelector(`.target-format-btn[data-format="${defaultTarget}"]`);
            if (defaultBtn) {
                defaultBtn.click();
            } else {
                formatButtons[0].click(); // Fallback
            }
        };
        originalImage.src = data;
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // --- EVENT LISTENERS ---

    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => b.classList.remove('selected', 'border-primary/40', 'bg-primary-container/10'));
            btn.classList.add('selected', 'border-primary/40', 'bg-primary-container/10');
            currentTargetFormat = btn.dataset.format;
            
            // Trigger automatic conversion when format changes
            autoConvert();
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!convertedBlob) return;
        
        const url = URL.createObjectURL(convertedBlob);
        const a = document.createElement('a');
        
        const ext = currentTargetFormat.split('/')[1].replace('jpeg', 'jpg');
        const originalName = originalFileInfo.name.split('.')[0];
        
        a.href = url;
        a.download = `transformed-${originalName}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => { 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url); 
        }, 100);
    });

    const backToUpload = () => {
        sessionStorage.clear();
        window.location.href = 'convert_page_upload.html';
    };

    newImageBtn.addEventListener('click', backToUpload);
    clearBtn.addEventListener('click', backToUpload);

    initFromSession();
});
