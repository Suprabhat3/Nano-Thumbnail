"use client"
import React, { useState } from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = require('../contexts/AuthContext').useAuth();

  return (
  <nav className="absolute top-0 left-0 w-full z-10 bg-transparent">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
            {/* Replace with your actual logo component or image */}
            <span className="text-white text-2xl font-bold h-10 w-10 "><img src="favicon.ico" alt="" /></span>
            <span className="text-white text-2xl font-bold">Nano Thumbnail</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6">
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/templates">Templates</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/changelog">Changelog</NavLink>
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/docs">Docs</NavLink>
        </div>

        {/* Auth Buttons or Logout */}
        <div className="hidden md:flex items-center space-x-4">
          {currentUser ? (
            <button
              onClick={logout}
              className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/login" className="text-white text-sm">
                Sign in
              </Link>
              <Link href="/signup" className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-900 bg-opacity-95 py-4">
          <div className="flex flex-col items-center space-y-4">
            <NavLink href="/discover">Discover</NavLink>
            <NavLink href="/templates">Templates</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/changelog">Changelog</NavLink>
            <NavLink href="/blog">Blog</NavLink>
            <NavLink href="/docs">Docs</NavLink>
            {currentUser ? (
              <button
                onClick={() => { setIsOpen(false); logout(); }}
                className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            ) : (
              <>
                <Link href="/login" className="text-white text-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children }) => (
  <Link href={href} className="text-white hover:text-gray-300 transition-colors text-sm">
    {children}
  </Link>
);

export default Navbar;