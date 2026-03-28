/**
 * Universal Header Component
 * Injects the unified navigation bar with dropdown functionality.
 */

const headerHTML = `
<nav class="fixed top-0 w-full z-50 bg-[#f5f6f7]/80 backdrop-blur-xl border-b border-gray-200/50">
    <div class="relative flex items-center justify-center px-8 py-4 max-w-7xl mx-auto">
        <!-- Logo -->
        <a href="index.html" class="absolute left-8 text-2xl font-bold text-[#2c2f30] tracking-tighter hover:opacity-80 transition-opacity">
            MinuteBytes
        </a>
        
        <!-- Navigation Links -->
        <div class="hidden md:flex items-center space-x-8 font-['Manrope'] font-semibold tracking-tight">
            <a href="index.html" id="nav-home" class="nav-link text-[#2c2f30] hover:text-[#006573] transition-all duration-300">Home</a>
            
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
        <div class="absolute right-8 hidden lg:block" style="display: none;">
            <span class="text-[10px] font-bold uppercase tracking-widest text-[#006573]/50">Professional Edition</span>
        </div>

        <!-- Mobile Hamburger -->
        <button id="mobile-menu-toggle" class="mobile-menu-toggle absolute right-8" type="button" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-menu-panel">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
    </div>
</nav>

<!-- Mobile Navigation -->
<div id="mobile-menu-overlay" class="mobile-menu-overlay" aria-hidden="true"></div>
<aside id="mobile-menu-panel" class="mobile-menu-panel" aria-hidden="true">
    <div class="mobile-menu-header">
        <span class="text-[10px] font-bold uppercase tracking-widest text-[#006573]/50">Navigation</span>
    </div>
    <div class="mobile-menu-links">
        <a href="index.html" id="mobile-nav-home" class="mobile-menu-link">Home</a>
        <div class="mobile-menu-group">Tools</div>
        <a href="compress_page_upload.html" class="mobile-menu-link">Image Compressor</a>
        <a href="resize_page_upload.html" class="mobile-menu-link">Image Resizer</a>
        <a href="crop_page_upload.html" class="mobile-menu-link">Image Cropper</a>
        <a href="convert_page_upload.html" class="mobile-menu-link">Image Converter</a>
        <a href="tools_page.html" class="mobile-menu-link mobile-menu-link-tools">View All Tools</a>
        <a href="about_page.html" id="mobile-nav-about" class="mobile-menu-link">About</a>
    </div>
</aside>

<!-- Inline Styles for the dropdown active state -->
<style>
    .nav-active {
        color: #006573 !important;
        border-bottom: 2px solid #006573;
        padding-bottom: 4px;
    }

    .mobile-menu-toggle,
    .mobile-menu-overlay,
    .mobile-menu-panel {
        display: none;
    }

    .mobile-menu-toggle {
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 4px;
        color: #2c2f30;
        transition: color 0.25s ease;
    }

    .mobile-menu-toggle:hover {
        color: #006573;
    }

    .hamburger-line {
        width: 20px;
        height: 2px;
        background: currentColor;
        border-radius: 999px;
        display: block;
    }

    .mobile-menu-overlay {
        position: fixed;
        inset: 0;
        background: rgba(44, 47, 48, 0.2);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 55;
    }

    .mobile-menu-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: min(86vw, 340px);
        height: 100vh;
        background: #f5f6f7;
        border-left: 1px solid rgba(229, 231, 235, 0.8);
        box-shadow: 0 20px 40px rgba(44, 47, 48, 0.12);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 60;
        overflow-y: auto;
    }

    .mobile-menu-header {
        padding: 20px 24px 12px;
        border-bottom: 1px solid rgba(229, 231, 235, 0.8);
    }

    .mobile-menu-links {
        padding: 12px 8px 20px;
    }

    .mobile-menu-link {
        display: block;
        width: 100%;
        padding: 12px 16px;
        font-family: Manrope, sans-serif;
        font-weight: 700;
        font-size: 0.95rem;
        color: #2c2f30;
        border-radius: 10px;
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    .mobile-menu-link:hover {
        background: rgba(93, 227, 252, 0.18);
        color: #006573;
    }

    .mobile-menu-group {
        margin: 8px 16px;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(0, 101, 115, 0.55);
    }

    .mobile-menu-link-tools {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .mobile-nav-active {
        color: #006573 !important;
        background: rgba(93, 227, 252, 0.2);
    }

    .mobile-menu-open .mobile-menu-overlay {
        opacity: 1;
        pointer-events: auto;
    }

    .mobile-menu-open .mobile-menu-panel {
        transform: translateX(0);
    }

    @media (max-width: 768px) {
        .mobile-menu-toggle {
            display: flex;
        }

        .mobile-menu-overlay {
            display: block;
        }

        .mobile-menu-panel {
            display: block;
        }
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
        
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
            document.getElementById('nav-home')?.classList.add(activeClass);
            document.getElementById('mobile-nav-home')?.classList.add('mobile-nav-active');
        } else if (path.includes('about_page.html')) {
            document.getElementById('nav-about')?.classList.add(activeClass);
            document.getElementById('mobile-nav-about')?.classList.add('mobile-nav-active');
        } else {
            // Tools highlighting for any tool pages
            const toolsTrigger = document.getElementById('nav-tools-trigger');
            if (path.includes('compress') || path.includes('resize') || path.includes('convert') || path.includes('tools_page')) {
                toolsTrigger?.classList.add(activeClass);
            }
        }

        const body = document.body;
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuPanel = document.getElementById('mobile-menu-panel');
        const mobileMenuLinks = mobileMenuPanel?.querySelectorAll('a') || [];
        let menuOpen = false;

        const setMobileMenuState = (open) => {
            menuOpen = open;
            body.classList.toggle('mobile-menu-open', open);
            mobileMenuToggle?.setAttribute('aria-expanded', String(open));
            mobileMenuOverlay?.setAttribute('aria-hidden', String(!open));
            mobileMenuPanel?.setAttribute('aria-hidden', String(!open));
            body.style.overflow = open ? 'hidden' : '';
        };

        mobileMenuToggle?.addEventListener('click', () => setMobileMenuState(!menuOpen));
        mobileMenuOverlay?.addEventListener('click', () => setMobileMenuState(false));
        mobileMenuLinks.forEach((link) => link.addEventListener('click', () => setMobileMenuState(false)));

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menuOpen) {
                setMobileMenuState(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && menuOpen) {
                setMobileMenuState(false);
            }
        });
    }
});
