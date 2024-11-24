'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import ResearchProfile from '@/app/components/research/ResearchProfile';

export default function ResearchProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect if not logged in
      if (!user) {
        router.push('/login');
        return;
      }

      // Redirect if not a research participant
      if (user.role !== 'research_participant') {
        router.push('/dashboard');
        return;
      }

      // Redirect if profile already completed
      if (user.profileComplete) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'research_participant' || user.profileComplete) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <ResearchProfile />
      </div>
    </Layout>
  );
}