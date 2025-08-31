// components/Footer.tsx
import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className=" text-gray-400 py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Logo and Description */}
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center space-x-2 mb-4">
            <span className="text-white text-2xl font-bold h-10 w-10 "><img src="/favicon.ico" alt="Nano Thumbnail Logo" /></span>
            <span className="text-white text-2xl font-bold">Nano Thumbnail</span>
          </Link>
          <p className="text-sm">
            Upload your image and describe your vision to create the perfect thumbnail
          </p>
          {/* Social Icons using <img> tags */}
          <div className="flex items-center space-x-4 mt-4">
            <a href="https://suprabhat.site/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="/social.png" alt="Website" className="h-8 w-8" />
            </a>
            <a href="https://x.com/Suprabhat_3" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="/twitter.png" alt="Twitter" className="h-8 w-8" />
            </a>
            <a href="https://github.com/Suprabhat3/chhaya-persona" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="/github.png" alt="GitHub" className="h-8 w-8" />
            </a>
            <a href="https://www.linkedin.com/in/suprabhatt/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="/linkedin.png" alt="LinkedIn" className="h-8 w-8" />
            </a>
            <a href="https://discord.gg/FTQjJSJXaM" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="/discord.png" alt="Discord" className="h-8 w-8" />
            </a>
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/careers">Careers</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </ul>
        </div>

        {/* Product */}
        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul>
            <FooterLink href="/features">Features</FooterLink>
            <FooterLink href="/templates">Templates</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
            <FooterLink href="/changelog">Changelog</FooterLink>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul>
            <FooterLink href="/terms">Terms of Service</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/cookies">Cookie Policy</FooterLink>
          </ul>
        </div>
      </div>

      <div className="container mx-auto px-4 border-t border-gray-800 mt-8 pt-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Nano Thumbnail. All rights reserved.</p>
      </div>
    </footer>
  );
};

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => (
  <li className="mb-2">
    <Link href={href} className="hover:text-white transition-colors text-sm">
      {children}
    </Link>
  </li>
);

export default Footer;