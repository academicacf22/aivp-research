'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Search, Filter, Download, Mail, Clock, Calculator } from 'lucide-react';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export default function ParticipantManager() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joinDate');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchParticipantsWithStats();
  }, []);

  const fetchParticipantsWithStats = async () => {
    try {
      // First fetch all users
      const userSnapshot = await getDocs(collection(db, 'users'));
      const participantData = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          joinDate: data.createdAt?.toDate?.() || new Date()
        };
      });

      // Process each participant's sessions
      const enrichedParticipants = await Promise.all(
        participantData.map(async (participant) => {
          try {
            const sessionsRef = collection(db, 'sessions');
            const sessionsQuery = query(
              sessionsRef,
              where('userId', '==', participant.id),
              where('status', '==', 'completed')
            );
            
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const sessions = sessionsSnapshot.docs
              .map(doc => {
                const data = doc.data();
                
                // Safely handle timestamp conversion
                let startTime = null;
                let endTime = null;
                
                try {
                  if (data.startTime?.toDate) {
                    startTime = data.startTime.toDate();
                  }
                  if (data.endTime?.toDate) {
                    endTime = data.endTime.toDate();
                  }
                } catch (e) {
                  console.error('Error converting timestamps:', e);
                  return null;
                }

                return startTime && endTime ? { startTime, endTime } : null;
              })
              .filter(Boolean); // Remove any null sessions

            // Calculate stats
            const sessionCount = sessions.length;
            const totalMinutes = sessions.reduce((acc, session) => {
              const duration = (session.endTime - session.startTime) / (1000 * 60);
              return acc + (isNaN(duration) ? 0 : Math.round(duration));
            }, 0);

            return {
              ...participant,
              sessionCount,
              totalMinutes,
              averageMinutes: sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0
            };
          } catch (error) {
            console.error(`Error processing sessions for ${participant.email}:`, error);
            // Return participant with zero stats instead of failing
            return {
              ...participant,
              sessionCount: 0,
              totalMinutes: 0,
              averageMinutes: 0
            };
          }
        })
      );

      setParticipants(enrichedParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Error loading participants');
    } finally {
      setLoading(false);
    }
  }; 

  const formatDuration = (minutes) => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes}m`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const filteredParticipants = participants
    .filter(p => {
      const matchesSearch = p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' ||
                          (filter === 'research' && p.role === 'research_participant') ||
                          (filter === 'pilot' && p.role === 'pilot_participant');
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const sortVal = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'joinDate':
          return sortVal * (new Date(a.joinDate) - new Date(b.joinDate));
        case 'email':
          return sortVal * (a.email || '').localeCompare(b.email || '');
        case 'sessions':
          return sortVal * ((b.sessionCount || 0) - (a.sessionCount || 0));
        case 'totalTime':
          return sortVal * ((b.totalMinutes || 0) - (a.totalMinutes || 0));
        case 'averageTime':
          return sortVal * ((b.averageMinutes || 0) - (a.averageMinutes || 0));
        default:
          return 0;
      }
    });

  const calculateAverages = () => {
    const activeParticipants = filteredParticipants.filter(p => p.sessionCount > 0);
    const totalSessions = activeParticipants.reduce((acc, p) => acc + p.sessionCount, 0);
    const averageSessionsPerUser = activeParticipants.length > 0 
      ? (totalSessions / activeParticipants.length).toFixed(1)
      : '0.0';
    const averageSessionLength = activeParticipants.length > 0
      ? formatDuration(Math.round(activeParticipants.reduce((acc, p) => acc + p.averageMinutes, 0) / activeParticipants.length))
      : '0m';
    return { averageSessionsPerUser, averageSessionLength };
  };

  const exportParticipants = () => {
    const exportData = filteredParticipants.map(p => ({
      Email: p.email || 'N/A',
      Name: p.displayName || 'N/A',
      Role: p.role || 'N/A',
      'Join Date': p.joinDate instanceof Date ? p.joinDate.toLocaleDateString() : 'N/A',
      'Sessions Completed': p.sessionCount || 0,
      'Total Time': formatDuration(p.totalMinutes || 0),
      'Average Session Length': formatDuration(p.averageMinutes || 0),
      'Research Consented': p.hasConsented ? 'Yes' : 'No',
      'Research ID': p.role === 'research_participant' ? (p.anonymousId || 'N/A') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(data, `participants-export-${timestamp}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { averageSessionsPerUser, averageSessionLength } = calculateAverages();

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search participants..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Participants</option>
            <option value="research">Research Participants</option>
            <option value="pilot">Pilot Participants</option>
          </select>
          
          <button
            onClick={exportParticipants}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition duration-200 flex items-center gap-2"
          >
            <Download className="h-5 w-5" />
            Export
          </button>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy('email');
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy('joinDate');
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Join Date
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy('sessions');
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Sessions
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy('totalTime');
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Total Time
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortBy('averageTime');
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Avg. Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Research ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{participant.email}</div>
                    {participant.displayName && (
                      <div className="text-sm text-gray-500">{participant.displayName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      participant.role === 'research_participant' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {participant.role === 'research_participant' ? 'Research' : 'Pilot'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {participant.joinDate instanceof Date ? participant.joinDate.toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {participant.sessionCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(participant.totalMinutes || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(participant.averageMinutes || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {participant.role === 'research_participant' ? participant.anonymousId || 'Not assigned' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => window.location.href = `mailto:${participant.email}`}
                      className="text-primary hover:text-secondary mr-4"
                    >
                      <Mail className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Participants</div>
          <div className="text-2xl font-bold text-primary">{participants.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Research Participants</div>
          <div className="text-2xl font-bold text-primary">
            {participants.filter(p => p.role === 'research_participant').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary opacity-70" />
            <div className="text-sm text-gray-500">Average Sessions/User</div>
            </div>
          <div className="text-2xl font-bold text-primary">{averageSessionsPerUser}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary opacity-70" />
            <div className="text-sm text-gray-500">Average Session Length</div>
          </div>
          <div className="text-2xl font-bold text-primary">{averageSessionLength}</div>
        </div>
      </div>

      {/* Debug Info - Only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <h4 className="font-semibold mb-2">Debug Information</h4>
          <p>Total sessions found: {participants.reduce((acc, p) => acc + p.sessionCount, 0)}</p>
          <p>Participants with sessions: {participants.filter(p => p.sessionCount > 0).length}</p>
        </div>
      )}
    </div>
  );
}