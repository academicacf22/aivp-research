// components/admin/ParticipantManager.js
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Search, Filter, Download, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export default function ParticipantManager() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, research, pilot
  const [sortBy, setSortBy] = useState('joinDate');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const participantData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        joinDate: doc.data().createdAt?.toDate?.() || new Date() // Safely handle timestamp conversion
      }));
      setParticipants(participantData);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Error loading participants');
    } finally {
      setLoading(false);
    }
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
        default:
          return 0;
      }
    });

  const exportParticipants = () => {
    const exportData = filteredParticipants.map(p => ({
      Email: p.email || 'N/A',
      Name: p.displayName || 'N/A',
      Role: p.role || 'N/A',
      'Join Date': p.joinDate instanceof Date ? p.joinDate.toLocaleDateString() : 'N/A',
      'Sessions Completed': p.sessionCount || 0,
      'Research Consented': p.hasConsented ? 'Yes' : 'No',
      'Research ID': p.role === 'research_participant' ? (p.anonymousId || 'N/A') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'participants.xlsx');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="text-sm text-gray-500">Average Sessions</div>
          <div className="text-2xl font-bold text-primary">
            {(participants.reduce((acc, p) => acc + (p.sessionCount || 0), 0) / participants.length || 0).toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}