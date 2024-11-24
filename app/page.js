'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import TestStyles from './components/TestStyles';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="/university-logo.png"
                alt="University Logo"
                width={200}
                height={50}
                className="mr-4"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">CLERKtheAI</h1>
                <p className="text-sm text-gray-600">Case-based Learning to Enhance Reasoning at Keele using AI</p>
              </div>
            </div>
            <div className="space-x-4">
              <Link href="/login" className="btn btn-secondary">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Advanced Clinical Reasoning Through AI
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience CLERKtheAI - an innovative approach to developing clinical reasoning skills through AI-powered virtual patient consultations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">For Students</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Practice clinical reasoning anytime</li>
              <li>• Receive instant, detailed feedback</li>
              <li>• Track your progress over time</li>
              <li>• Access diverse patient cases</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">Research Study</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Contribute to medical education research</li>
              <li>• Shape the future of clinical training</li>
              <li>• Secure and confidential participation</li>
              <li>• Flexible engagement options</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-primary mb-4">Getting Started</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Quick 5-minute sign-up process</li>
              <li>• Immediate platform access</li>
              <li>• Easy-to-use interface</li>
              <li>• Comprehensive onboarding</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Link href="/signup" className="btn btn-primary px-8 py-4 text-lg">
            Start Your Journey
          </Link>
        </div>
      </main>
      
      <footer className="bg-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>© 2024 CLERKtheAI - Keele University School of Medicine</p>
          <p className="mt-2 text-sm">Case-based Learning to Enhance Reasoning at Keele using AI</p>
        </div>
      </footer>
    </div>
  );
}