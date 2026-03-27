/**
 * Universal Header Component
 * Injects the unified navigation bar with dropdown functionality.
 */

const headerHTML = `
<nav class="fixed top-0 w-full z-50 bg-[#f5f6f7]/80 backdrop-blur-xl border-b border-gray-200/50">
    <div class="relative flex items-center justify-center px-8 py-4 max-w-7xl mx-auto">
        <!-- Logo -->
        <a href="home_page.html" class="absolute left-8 text-2xl font-bold text-[#2c2f30] tracking-tighter hover:opacity-80 transition-opacity">
            Ethereal Canvas
        </a>
        
        <!-- Navigation Links -->
        <div class="hidden md:flex items-center space-x-8 font-['Manrope'] font-semibold tracking-tight">
            <a href="home_page.html" id="nav-home" class="nav-link text-[#2c2f30] hover:text-[#006573] transition-all duration-300">Home</a>
            
            <!-- Tools Dropdown -->
            <div class="relative group">
                <button id="nav-tools-trigger" class="flex items-center gap-1 nav-link text-[#2c2f30] hover:text-[#006573] transition-all duration-300 py-2">
                    Tools
                    <span class="material-symbols-outlined text-sm transition-transform duration-300 group-hover:rotate-180">expand_more</span>
                </button>
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-48 bg-white/95 backdrop-blur-2xl border border-gray-200/60 rounded-md shadow-2xl py-2 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300">
                    <a href="compress_page_upload.html" class="block px-4 py-2 text-sm text-[#2c2f30] hover:bg-primary-container/20 hover:text-primary transition-colors">Image Compressor</a>
                    <a href="resize_page_upload.html" class="block px-4 py-2 text-sm text-[#2c2f30] hover:bg-primary-container/20 hover:text-primary transition-colors">Image Resizer</a>
                    <a href="crop_page_upload.html" class="block px-4 py-2 text-sm text-[#2c2f30] hover:bg-primary-container/20 hover:text-primary transition-colors">Image Cropper</a>
                    <a href="convert_page_upload.html" class="block px-4 py-2 text-sm text-[#2c2f30] hover:bg-primary-container/20 hover:text-primary transition-colors">Image Converter</a>
                    <div class="border-t border-gray-100 my-1"></div>
                    <a href="tools_page.html" class="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#006573]/50 hover:text-primary transition-colors text-center">View All Tools</a>
                </div>
            </div>

            <a href="about_page.html" id="nav-about" class="nav-link text-[#2c2f30] hover:text-[#006573] transition-all duration-300">About</a>
        </div>
        
        <!-- Action Button (Optional Placeholder) -->
        <div class="absolute right-8 hidden lg:block">
            <span class="text-[10px] font-bold uppercase tracking-widest text-[#006573]/50">Professional Edition</span>
        </div>
    </div>
</nav>

<!-- Inline Styles for the dropdown active state -->
<style>
    .nav-active {
        color: #006573 !important;
        border-bottom: 2px solid #006573;
        padding-bottom: 4px;
    }
</style>
`;

document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('header-placeholder');
    if (placeholder) {
        placeholder.innerHTML = headerHTML;
        
        // Highlight active page
        const path = window.location.pathname;
        const activeClass = 'nav-active';
        
        if (path.includes('home_page.html') || path === '/' || path.endsWith('/')) {
            document.getElementById('nav-home')?.classList.add(activeClass);
        } else if (path.includes('about_page.html')) {
            document.getElementById('nav-about')?.classList.add(activeClass);
        } else {
            // Tools highlighting for any tool pages
            const toolsTrigger = document.getElementById('nav-tools-trigger');
            if (path.includes('compress') || path.includes('resize') || path.includes('convert') || path.includes('tools_page')) {
                toolsTrigger?.classList.add(activeClass);
            }
        }
    }
});
