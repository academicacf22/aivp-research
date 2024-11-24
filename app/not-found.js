'use client';

import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link 
          href={user ? '/dashboard' : '/'}
          className="btn btn-primary"
        >
          Return to {user ? 'Dashboard' : 'Home'}
        </Link>
      </div>
    </div>
  );
}