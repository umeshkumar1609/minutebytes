/**
 * Universal Footer Component
 * Injects the unified footer into all pages.
 */

const footerHTML = `
<footer class="bg-[#eff1f2] w-full py-12 border-t border-[#abadae]/15 mt-auto">
    <div class="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto gap-8">
        <div class="flex flex-col items-center md:items-start gap-2">
            <div class="text-lg font-black text-[#2c2f30] uppercase tracking-tighter">MinuteBytes</div>
            <div class="text-[#2c2f30]/50 font-['Inter'] text-[10px] uppercase tracking-widest">
                Editorial Precision in Image Processing
            </div>
        </div>
        
        <div class="flex flex-wrap justify-center gap-8 font-['Inter'] text-[11px] font-bold uppercase tracking-wider">
            <a class="text-[#2c2f30]/70 hover:text-[#006573] transition-colors" href="about_page.html">About</a>
            <a class="text-[#2c2f30]/70 hover:text-[#006573] transition-colors" href="privacy_policy.html">Privacy Policy</a>
            <a class="text-[#2c2f30]/70 hover:text-[#006573] transition-colors" href="terms_of_service.html">Terms of Service</a>
            <a class="text-[#2c2f30]/70 hover:text-[#006573] transition-colors" href="contact_support.html">Contact Support</a>
        </div>
        
        <div class="text-[#2c2f30]/40 font-['Inter'] text-[10px] uppercase tracking-[0.2em]">
            © 2024 MinuteBytes. All rights reserved.
        </div>
    </div>
</footer>
`;

document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
        placeholder.innerHTML = footerHTML;
    }
});
