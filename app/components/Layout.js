'use client';

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Header Content */}
          <div className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Title and Navigation Section */}
              <div className="flex-1 text-center sm:text-left">
                {!user ? (
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-primary font-serif tracking-wide mb-2">
                      CLERK<span className="text-secondary">the</span>AI
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 max-w-md">
                      Case-based Learning to Enhance Reasoning at Keele using AI
                    </p>
                  </div>
                ) : (
                  <Link href="/dashboard">
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif tracking-wide">
                      CLERK<span className="text-secondary">the</span>AI
                    </h1>
                  </Link>
                )}
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden sm:block">
                <div className="flex items-center gap-4">
                  {user ? (
                    <>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-gray-600 hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      >
                        <LogOut className="h-5 w-5 mr-1" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="px-6 py-2 bg-primary text-white hover:bg-secondary rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </nav>

              {/* Mobile Menu Button */}
              <button
                className="sm:hidden p-2 text-gray-600 hover:text-primary"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <div className="sm:hidden border-t border-gray-200">
              <div className="py-2 space-y-2">
                {user ? (
                  <>
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors flex items-center"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block mx-4 py-2 text-center bg-primary text-white hover:bg-secondary rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-md mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            {/* Keele Logo */}
            <Link href="https://www.keele.ac.uk" target="_blank" rel="noopener noreferrer">
              <div className="w-[180px] h-[48px] relative">
                <Image
                  src="/university-logo.png"
                  alt="Keele University Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </Link>
            
            {/* Copyright */}
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} CLERKtheAI - Keele University School of Medicine
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}