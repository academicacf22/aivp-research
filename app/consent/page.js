'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ConsentForm from '../components/auth/ConsentForm';
import Image from 'next/image';

export default function ConsentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      // If user has already consented, redirect appropriately
      if (user.hasConsented) {
        if (!user.profileComplete) {
          router.push('/research-profile');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.hasConsented) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white shadow py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Image
            src="/university-logo.png"
            alt="University Logo"
            width={150}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="flex-grow container mx-auto py-8">
        <ConsentForm />
      </main>
    </div>
  );
}