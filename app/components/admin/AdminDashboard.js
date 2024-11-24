// components/admin/AdminDashboard.js
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  FileText,
  AlertTriangle,
  BarChart 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pilotParticipants: 0,
    researchParticipants: 0,
    activeResearchParticipants: 0,
    totalSessions: 0,
    averageSessionLength: 0,
    recentTranscripts: []
  });
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate user statistics
      const pilotParticipants = users.filter(user => user.role === 'pilot_participant');
      const researchParticipants = users.filter(user => user.role === 'research_participant');
      const activeResearchParticipants = researchParticipants.filter(user => 
        !user.consentWithdrawnAt && user.hasConsented
      );
      
      // Fetch research transcripts only
      const transcriptsQuery = query(
        collection(db, 'transcripts'), 
        where('isResearchSession', '==', true)
      );
      const transcriptsSnapshot = await getDocs(transcriptsQuery);
      const transcripts = transcriptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate total session time for research participants
      const totalSessionTime = transcripts.reduce((acc, t) => {
        const duration = t.endTime?.seconds - t.startTime?.seconds || 0;
        return acc + duration;
      }, 0);

      // Get recent research transcripts
      const recentTranscripts = transcripts
        .sort((a, b) => b.startTime?.seconds - a.startTime?.seconds)
        .slice(0, 5);

      setStats({
        totalUsers: users.length,
        pilotParticipants: pilotParticipants.length,
        researchParticipants: researchParticipants.length,
        activeResearchParticipants: activeResearchParticipants.length,
        totalSessions: transcripts.length,
        averageSessionLength: transcripts.length > 0 ? Math.round(totalSessionTime / transcripts.length / 60) : 0,
        recentTranscripts
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Error loading dashboard statistics');
    }
  };

  const handleDataReset = async () => {
    if (!window.confirm(
      'WARNING: This will permanently delete all research data including transcripts and metrics. This action cannot be undone. Are you sure you want to proceed?'
    )) return;

    if (!window.confirm(
      'Please confirm again that you want to reset all research data. This will remove ALL research participant data and cannot be recovered.'
    )) return;

    setResetLoading(true);
    try {
      // Reset research participants to pilot status
      const usersRef = collection(db, 'users');
      const researchQuery = query(usersRef, where('role', '==', 'research_participant'));
      const researchSnapshot = await getDocs(researchQuery);

      await Promise.all(researchSnapshot.docs.map(doc => {
        return updateDoc(doc.ref, {
          role: 'pilot_participant',
          hasConsented: false,
          anonymousId: null,
          consentDetails: null,
          lastUpdated: serverTimestamp()
        });
      }));

      // Delete all research transcripts
      const transcriptsRef = collection(db, 'transcripts');
      const transcriptsQuery = query(transcriptsRef, where('isResearchSession', '==', true));
      const transcriptsSnapshot = await getDocs(transcriptsQuery);

      await Promise.all(transcriptsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

      // Delete all research participant profiles
      const participantsRef = collection(db, 'research_participants');
      const participantsSnapshot = await getDocs(participantsRef);

      await Promise.all(participantsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

      // Add reset event to audit log
      await addDoc(collection(db, 'audit_logs'), {
        type: 'data_reset',
        timestamp: serverTimestamp(),
        details: {
          researchParticipantsReset: researchSnapshot.docs.length,
          transcriptsDeleted: transcriptsSnapshot.docs.length,
          profilesDeleted: participantsSnapshot.docs.length
        }
      });

      toast.success('Research data has been reset successfully');
      fetchDashboardStats(); // Refresh stats
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Error resetting research data');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* User Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="All registered platform users"
          breakdown={[
            { label: 'Research Participants', value: stats.researchParticipants },
            { label: 'Pilot Participants', value: stats.pilotParticipants }
          ]}
        />
        <StatCard
          title="Research Participants"
          value={stats.activeResearchParticipants}
          icon={Users}
          description="Active research participants"
          detail={`${stats.researchParticipants - stats.activeResearchParticipants} withdrawn`}
          highlight
        />
        <StatCard
          title="Research Sessions"
          value={stats.totalSessions}
          icon={MessageSquare}
          description="Total research consultations"
          detail={`Avg. ${stats.averageSessionLength} min per session`}
        />
      </div>

      {/* Data Reset Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">Data Management</h2>
            <p className="text-sm text-gray-600 mt-1">Reset research data for new study phase</p>
          </div>
          <button
            onClick={handleDataReset}
            disabled={resetLoading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <AlertTriangle className="h-5 w-5" />
            {resetLoading ? 'Resetting...' : 'Reset Research Data'}
          </button>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Warning: Data Reset
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Resetting research data will:</p>
                <ul className="list-disc list-inside mt-1">
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

      {/* Recent Research Transcripts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Recent Research Consultations</h2>
        <div className="space-y-4">
          {stats.recentTranscripts.map((transcript) => (
            <div 
              key={transcript.id} 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Research ID: {transcript.anonymousId}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transcript.startTime?.seconds * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round((transcript.endTime?.seconds - transcript.startTime?.seconds) / 60)} minutes
              </span>
            </div>
          ))}
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