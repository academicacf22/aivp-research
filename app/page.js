'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import Link from 'next/link';
import Layout from './components/Layout';

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
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Advanced Clinical Reasoning Through AI
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience CLERKtheAI - an innovative approach to developing clinical reasoning skills through AI-powered virtual patient consultations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-primary mb-4">For Students</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Practice clinical reasoning anytime
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Receive instant, detailed feedback
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Track your progress over time
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Access diverse patient cases
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-primary mb-4">Research Study</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Contribute to medical education research
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Shape the future of clinical training
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Secure and confidential participation
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Flexible engagement options
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-primary mb-4">Getting Started</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Quick 5-minute sign-up process
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Immediate platform access
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Easy-to-use interface
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Comprehensive onboarding
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg bg-primary text-white hover:bg-secondary rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Start Your Journey
          </Link>
        </div>
      </div>
    </Layout>
  );
}