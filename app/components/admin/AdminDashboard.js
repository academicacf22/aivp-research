// components/admin/AdminDashboard.js
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FileText, Users, Clock } from 'lucide-react';
import ParticipantManager from './ParticipantManager';
import TranscriptManager from './TranscriptManager';
import ResearchMetrics from './ResearchMetrics';
import CostsManager from './CostsManager';

export default function AdminDashboard() {
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingStats, setIsResettingStats] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    researchParticipants: 0,
    pilotParticipants: 0,
    withdrawnParticipants: 0,
    researchSessions: 0,
    avgSessionDuration: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate user statistics
      const researchParticipants = users.filter(user => user.role === 'research_participant');
      const pilotParticipants = users.filter(user => user.role === 'pilot_participant');
      const withdrawnParticipants = researchParticipants.filter(user => user.consentWithdrawnAt);
      
      // Fetch research transcripts
      const transcriptsQuery = query(
        collection(db, 'transcripts'), 
        where('isResearchSession', '==', true)
      );
      const transcriptsSnapshot = await getDocs(transcriptsQuery);
      const transcripts = transcriptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate average session duration
      const totalDuration = transcripts.reduce((acc, t) => {
        const duration = t.endTime?.seconds - t.startTime?.seconds || 0;
        return acc + duration;
      }, 0);
      const avgDuration = transcripts.length ? Math.round(totalDuration / transcripts.length / 60) : 0;

      setStats({
        totalUsers: users.length,
        researchParticipants: researchParticipants.length,
        pilotParticipants: pilotParticipants.length,
        withdrawnParticipants: withdrawnParticipants.length,
        researchSessions: transcripts.length,
        avgSessionDuration: avgDuration
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Error loading dashboard statistics');
    }
  };

  const resetAllStats = async () => {
    if (!window.confirm('Are you sure you want to reset all statistics? This will clear all historical data including transcripts, sessions, and costs while preserving user accounts and consent records. This action cannot be undone.')) {
      return;
    }

    setIsResettingStats(true);
    try {
      // 1. Clear transcripts collection
      const transcriptsRef = collection(db, 'transcripts');
      const transcriptsSnapshot = await getDocs(transcriptsRef);
      const deleteTranscripts = transcriptsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteTranscripts);

      // 2. Clear sessions collection
      const sessionsRef = collection(db, 'sessions');
      const sessionsSnapshot = await getDocs(sessionsRef);
      const deleteSessions = sessionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteSessions);

      // 3. Reset user statistics while preserving accounts and consent
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const updateUsers = usersSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          sessionCount: 0,
          totalTime: 0,
          lastSession: null,
          // Preserve: role, email, hasConsented, consentDate, anonymousId
        })
      );
      await Promise.all(updateUsers);

      toast.success('All statistics have been reset successfully');
      fetchDashboardStats(); // Refresh stats after reset
    } catch (error) {
      console.error('Error resetting statistics:', error);
      toast.error('Error resetting statistics');
    } finally {
      setIsResettingStats(false);
    }
  };

  const resetResearchData = async () => {
    if (!window.confirm('Are you sure you want to reset all research data? This action cannot be undone.')) {
      return;
    }

    setIsResetting(true);
    try {
      // 1. Convert research participants to pilot participants
      const usersRef = collection(db, 'users');
      const researchUsersQuery = query(usersRef, where('role', '==', 'research_participant'));
      const researchUsersSnapshot = await getDocs(researchUsersQuery);
      
      const updatePromises = researchUsersSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          role: 'pilot_participant',
          hasConsented: false,
          consentDate: null,
          consentWithdrawnAt: null
        })
      );
      await Promise.all(updatePromises);

      // 2. Delete research transcripts and metrics
      const transcriptsRef = collection(db, 'transcripts');
      const transcriptsQuery = query(transcriptsRef, where('isResearchSession', '==', true));
      const transcriptsSnapshot = await getDocs(transcriptsQuery);
      
      const deletePromises = transcriptsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      toast.success('Research data has been reset successfully');
      fetchDashboardStats(); // Refresh stats after reset
    } catch (error) {
      console.error('Error resetting research data:', error);
      toast.error('Error resetting research data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Total Users</h3>
          <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
          <p className="text-sm text-gray-500 mt-2">All registered platform users</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Research Participants</span>
              <span>{stats.researchParticipants}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pilot Participants</span>
              <span>{stats.pilotParticipants}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Research Participants</h3>
          <div className="text-3xl font-bold text-primary">{stats.researchParticipants}</div>
          <p className="text-sm text-gray-500 mt-2">Active research participants</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span>Withdrawn</span>
              <span>{stats.withdrawnParticipants}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Research Sessions</h3>
          <div className="text-3xl font-bold text-primary">{stats.researchSessions}</div>
          <p className="text-sm text-gray-500 mt-2">Total research consultations</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span>Avg. Duration</span>
              <span>{stats.avgSessionDuration} min per session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
            <p className="text-sm text-gray-500">Reset data for new study phases</p>
          </div>
          <div className="space-x-4">
            <button
              onClick={resetAllStats}
              disabled={isResettingStats}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isResettingStats ? 'Resetting Stats...' : 'Reset All Statistics'}
            </button>
            <button
              onClick={resetResearchData}
              disabled={isResetting}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isResetting ? 'Resetting...' : 'Reset Research Data'}
            </button>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warning: Data Reset Options</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="font-medium">Reset All Statistics will:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Clear all transcripts and session records</li>
                  <li>Reset user statistics while preserving accounts</li>
                  <li>Clear token usage and cost tracking data</li>
                  <li>Maintain user consent records</li>
                </ul>
                
                <p className="font-medium mt-4">Reset Research Data will:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Convert all research participants to pilot participants</li>
                  <li>Delete all research transcripts and metrics</li>
                  <li>Remove all research participant profiles</li>
                  <li>Clear consent records (maintaining audit logs)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Pricing Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Model Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">gpt-3.5-turbo</h4>
            <p className="text-sm text-gray-600">Input: $0.0015 per 1K tokens</p>
            <p className="text-sm text-gray-600">Output: $0.002 per 1K tokens</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">gpt-4</h4>
            <p className="text-sm text-gray-600">Input: $0.03 per 1K tokens</p>
            <p className="text-sm text-gray-600">Output: $0.06 per 1K tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, detail, breakdown, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${highlight ? 'ring-2 ring-primary ring-opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-primary mt-1">{value}</p>
        </div>
        <div className="bg-primary bg-opacity-10 p-3 rounded-full">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
      {detail && (
        <p className="text-sm text-gray-600 mt-1">{detail}</p>
      )}
      {breakdown && (
        <div className="mt-3 space-y-1">
          {breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-500">{item.label}</span>
              <span className="font-medium text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}