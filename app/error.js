'use client';
 
import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';
 
export default function Error({
  error,
  reset,
}) {
  const { user } = useAuth();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);
 
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-8">
          An unexpected error has occurred. Our team has been notified.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            Try again
          </button>
          <Link 
            href={user ? '/dashboard' : '/'}
            className="btn btn-secondary"
          >
            Return to {user ? 'Dashboard' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}