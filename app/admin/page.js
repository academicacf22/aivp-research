'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import AdminNav from '../components/admin/AdminNav';
import AdminDashboard from '../components/admin/AdminDashboard';
import ParticipantManager from '../components/admin/ParticipantManager';
import TranscriptManager from '../components/admin/TranscriptManager';
import ResearchMetrics from '../components/admin/ResearchMetrics';
import { toast } from 'react-toastify';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      toast.error('Unauthorized access');
      router.push('/dashboard');
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'participants':
        return <ParticipantManager />;
      case 'transcripts':
        return <TranscriptManager />;
      case 'metrics':
        return <ResearchMetrics />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <AdminNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-5">
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
}