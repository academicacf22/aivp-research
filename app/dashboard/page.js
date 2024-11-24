'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import ConsentStatus from '../components/dashboard/ConsentStatus';
import ConsentWithdrawalButton from '../components/dashboard/ConsentWithdrawalButton';
import StatsCard from '../components/ui/stats-card';
import AnimatedCard from '../components/ui/animated-card';
import { MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleStartConsultation = () => {
    router.push('/consultation');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Welcome{user.metadata?.name ? `, ${user.metadata.name}` : ''}
          </h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'research_participant' 
              ? 'Thank you for participating in our research study.'
              : 'You are currently participating in the pilot program.'}
          </p>
        </div>

        {/* Consent Status Banner for Pilot Participants */}
        {user.role === 'pilot_participant' && <ConsentStatus />}

        {/* Main Dashboard Content */}
        <div className="space-y-8">
          {/* Start Consultation Button */}
          <AnimatedCard 
            onClick={handleStartConsultation}
            className="p-6 bg-gradient-to-r from-primary to-secondary text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Start Virtual Patient Consultation</h2>
                <p className="text-white/90">Begin a new clinical consultation with an AI virtual patient</p>
              </div>
              <MessageSquare className="h-12 w-12 opacity-90" />
            </div>
          </AnimatedCard>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Cases Completed"
              type="cases"
              userId={user.uid}
            />
            <StatsCard
              title="Total Consultation Time"
              type="time"
              userId={user.uid}
            />
            <StatsCard
              title="Average Session Length"
              type="average"
              userId={user.uid}
            />
          </div>

          {/* Research Participant Information */}
          {user.role === 'research_participant' && <ConsentWithdrawalButton />}
        </div>
      </div>
    </Layout>
  );
}