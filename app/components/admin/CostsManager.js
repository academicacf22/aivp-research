'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';

const ITEMS_PER_PAGE = 25;
const DATE_PRESETS = {
  '7days': { label: 'Last 7 Days', days: 7 },
  '1month': { label: 'Last Month', days: 30 },
  '3months': { label: 'Last 3 Months', days: 90 },
  'all': { label: 'All Time', days: null }
};

const MODEL_PRICING = {
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006
  }
};

export default function CostsManager() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [dateRange, setDateRange] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [participantType, setParticipantType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add new state for stats
  const [stats, setStats] = useState({
    consultations: {
      total: 0,
      research: 0,
      pilot: 0,
      peakPeriod: { period: '', count: 0 }
    },
    tokens: {
      total: 0,
      research: 0,
      pilot: 0,
      avgPerSession: {
        research: 0,
        pilot: 0
      }
    },
    costs: {
      total: 0,
      research: 0,
      pilot: 0,
      avgPerSession: {
        research: 0,
        pilot: 0
      },
      peakPeriod: { period: '', amount: 0 }
    }
  });

  useEffect(() => {
    fetchTranscripts();
  }, [dateRange, selectedModel, participantType]); // Fetch when filters change

  const fetchTranscripts = async (isLoadMore = false) => {
    try {
      setLoading(true);
      let queryConstraints = [];

      // Add date filter
      if (dateRange !== 'all') {
        const daysAgo = DATE_PRESETS[dateRange].days;
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysAgo);
        queryConstraints.push(where('startTime', '>=', dateLimit));
      }

      // Add model filter
      if (selectedModel !== 'all') {
        queryConstraints.push(where('tokenMetrics.model', '==', selectedModel));
      }

      // Add participant type filter
      if (participantType !== 'all') {
        queryConstraints.push(where('isResearchSession', '==', participantType === 'research'));
      }

      // Always add ordering and limit
      queryConstraints.push(orderBy('startTime', 'desc'));
      
      if (isLoadMore && lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }
      
      queryConstraints.push(limit(ITEMS_PER_PAGE));

      // Create and execute query
      const q = query(collection(db, 'transcripts'), ...queryConstraints);
      const snapshot = await getDocs(q);

      // Process results
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate()
      }));

      // Calculate stats from all transcripts
      const statsData = {
        consultations: {
          total: docs.length,
          research: docs.filter(d => d.isResearchSession).length,
          pilot: docs.filter(d => !d.isResearchSession).length,
          peakPeriod: calculatePeakPeriod(docs)
        },
        tokens: {
          total: docs.reduce((acc, d) => acc + (d.tokenMetrics?.totalTokens || 0), 0),
          research: docs.filter(d => d.isResearchSession)
            .reduce((acc, d) => acc + (d.tokenMetrics?.totalTokens || 0), 0),
          pilot: docs.filter(d => !d.isResearchSession)
            .reduce((acc, d) => acc + (d.tokenMetrics?.totalTokens || 0), 0),
          avgPerSession: {
            research: calculateAvgTokens(docs.filter(d => d.isResearchSession)),
            pilot: calculateAvgTokens(docs.filter(d => !d.isResearchSession))
          }
        },
        costs: {
          total: docs.reduce((acc, d) => acc + (d.tokenMetrics?.totalCost || 0), 0),
          research: docs.filter(d => d.isResearchSession)
            .reduce((acc, d) => acc + (d.tokenMetrics?.totalCost || 0), 0),
          pilot: docs.filter(d => !d.isResearchSession)
            .reduce((acc, d) => acc + (d.tokenMetrics?.totalCost || 0), 0),
          avgPerSession: {
            research: calculateAvgCost(docs.filter(d => d.isResearchSession)),
            pilot: calculateAvgCost(docs.filter(d => !d.isResearchSession))
          },
          peakPeriod: calculatePeakCostPeriod(docs)
        }
      };

      setStats(statsData);

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

      if (isLoadMore) {
        setTranscripts(prev => [...prev, ...docs]);
      } else {
        setTranscripts(docs);
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      if (error.message.includes('requires an index')) {
        toast.error('Database index is being created. Please try again in a few minutes.');
      } else {
        toast.error('Error loading cost data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter handlers
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setLastDoc(null); // Reset pagination
  };

  const handleModelChange = (value) => {
    setSelectedModel(value);
    setLastDoc(null); // Reset pagination
  };

  const handleParticipantTypeChange = (value) => {
    setParticipantType(value);
    setLastDoc(null); // Reset pagination
  };

  const exportToExcel = () => {
    try {
      // Prepare data for main consultations
      const consultationsData = transcripts.map(t => ({
        'Date & Time': t.startTime?.toLocaleString(),
        'User/Research ID': t.isResearchSession ? t.anonymousId : t.userId,
        'Type': t.isResearchSession ? 'Research' : 'Pilot',
        'Model': t.tokenMetrics?.model || 'Unknown',
        'Duration (minutes)': Math.round((t.endTime - t.startTime) / (1000 * 60)),
        'Messages': t.messages?.filter(m => m.type === 'user').length || 0,
        'Total Tokens': t.tokenMetrics?.totalTokens || 0,
        'Cost ($)': t.tokenMetrics?.totalCost?.toFixed(4) || '0.0000'
      }));

      // Prepare data for user summary
      const userSummaryData = transcripts.reduce((acc, transcript) => {
        const userId = transcript.isResearchSession ? transcript.anonymousId : transcript.userId;
        const existingUser = acc.find(u => u.id === userId);
        
        if (existingUser) {
          existingUser.consultations += 1;
          existingUser.totalCost += transcript.tokenMetrics?.totalCost || 0;
          existingUser.totalMessages += transcript.messages?.filter(m => m.type === 'user').length || 0;
        } else {
          acc.push({
            id: userId,
            isResearch: transcript.isResearchSession,
            consultations: 1,
            totalCost: transcript.tokenMetrics?.totalCost || 0,
            totalMessages: transcript.messages?.filter(m => m.type === 'user').length || 0
          });
        }
        return acc;
      }, [])
      .map(user => ({
        'User/Research ID': user.id,
        'Type': user.isResearch ? 'Research' : 'Pilot',
        'Consultations': user.consultations,
        'Total Cost ($)': user.totalCost.toFixed(4),
        'Total Messages': user.totalMessages
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Add consultations sheet
      const ws1 = XLSX.utils.json_to_sheet(consultationsData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Consultations');
      
      // Add user summary sheet
      const ws2 = XLSX.utils.json_to_sheet(userSummaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'User Summary');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save file
      saveAs(data, `costs-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting data');
    }
  };

  // Helper functions for stats calculations
  const calculateAvgTokens = (transcripts) => {
    if (!transcripts.length) return 0;
    const total = transcripts.reduce((acc, t) => acc + (t.tokenMetrics?.totalTokens || 0), 0);
    return Math.round(total / transcripts.length);
  };

  const calculateAvgCost = (transcripts) => {
    if (!transcripts.length) return 0;
    const total = transcripts.reduce((acc, t) => acc + (t.tokenMetrics?.totalCost || 0), 0);
    return total / transcripts.length;
  };

  const calculatePeakPeriod = (transcripts) => {
    if (!transcripts.length) return { period: 'N/A', count: 0 };
    const periods = transcripts.reduce((acc, t) => {
      const period = t.startTime.toLocaleString('default', { month: 'short', year: '2-digit' });
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {});
    const peak = Object.entries(periods).reduce((a, b) => b[1] > a[1] ? b : a);
    return { period: peak[0], count: peak[1] };
  };

  const calculatePeakCostPeriod = (transcripts) => {
    if (!transcripts.length) return { period: 'N/A', amount: 0 };
    const periods = transcripts.reduce((acc, t) => {
      const period = t.startTime.toLocaleString('default', { month: 'short', year: '2-digit' });
      acc[period] = (acc[period] || 0) + (t.tokenMetrics?.totalCost || 0);
      return acc;
    }, {});
    const peak = Object.entries(periods).reduce((a, b) => b[1] > a[1] ? b : a);
    return { period: peak[0], amount: peak[1] };
  };

  // Add back the export functions
  const exportUserSummary = () => {
    const summaryData = transcripts.reduce((acc, transcript) => {
      const userId = transcript.isResearchSession ? transcript.anonymousId : transcript.userId;
      const existingUser = acc.find(u => u.id === userId);
      
      if (existingUser) {
        existingUser.consultations += 1;
        existingUser.totalCost += transcript.tokenMetrics?.totalCost || 0;
        existingUser.totalMessages += transcript.messages?.filter(m => m.type === 'user').length || 0;
      } else {
        acc.push({
          'User/Research ID': userId,
          'Type': transcript.isResearchSession ? 'Research' : 'Pilot',
          'Consultations': 1,
          'Total Cost': transcript.tokenMetrics?.totalCost || 0,
          'Total Messages': transcript.messages?.filter(m => m.type === 'user').length || 0
        });
      }
      return acc;
    }, []);

    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Summary');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'user-summary.xlsx');
  };

  const exportConsultations = () => {
    const consultationData = transcripts.map(transcript => ({
      'Date & Time': transcript.startTime?.toLocaleString(),
      'User/Research ID': transcript.isResearchSession ? transcript.anonymousId : transcript.userId,
      'Type': transcript.isResearchSession ? 'Research' : 'Pilot',
      'Model': transcript.tokenMetrics?.model || 'Unknown',
      'Duration (min)': Math.round((transcript.endTime - transcript.startTime) / (1000 * 60)),
      'Messages': transcript.messages?.filter(m => m.type === 'user').length || 0,
      'Tokens': transcript.tokenMetrics?.totalTokens || 0,
      'Cost': transcript.tokenMetrics?.totalCost || 0
    }));

    const ws = XLSX.utils.json_to_sheet(consultationData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultations');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'consultations.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Model Pricing Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Model Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">gpt-3.5-turbo</h4>
            <p className="text-sm text-gray-600">Input: $0.0005 per 1K tokens</p>
            <p className="text-sm text-gray-600">Output: $0.0015 per 1K tokens</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">gpt-4</h4>
            <p className="text-sm text-gray-600">Input: $0.03 per 1K tokens</p>
            <p className="text-sm text-gray-600">Output: $0.06 per 1K tokens</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">gpt-4o-mini</h4>
            <p className="text-sm text-gray-600">Input: $0.00015 per 1K tokens</p>
            <p className="text-sm text-gray-600">Output: $0.0006 per 1K tokens</p>
          </div>
        </div>
      </div>

      {/* Filters Section - Moved to top */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          >
            {Object.entries(DATE_PRESETS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value="all">All Models</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
          </select>

          <select
            value={participantType}
            onChange={(e) => setParticipantType(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value="all">All Participants</option>
            <option value="research">Research</option>
            <option value="pilot">Pilot</option>
          </select>

          <input
            type="text"
            placeholder="Search by ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Consultation Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Consultations</h3>
          <div className="text-3xl font-bold text-primary">{stats.consultations.total}</div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Research Sessions</span>
              <span>{stats.consultations.research}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pilot Sessions</span>
              <span>{stats.consultations.pilot}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Peak Usage</div>
              <div className="text-sm font-medium">
                {stats.consultations.peakPeriod.period}: {stats.consultations.peakPeriod.count} sessions
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Token Usage</h3>
          <div className="text-3xl font-bold text-primary">
            {stats.tokens.total.toLocaleString()}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Research Sessions</span>
              <span>{stats.tokens.research.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pilot Sessions</span>
              <span>{stats.tokens.pilot.toLocaleString()}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Average per Session</div>
              <div className="flex justify-between text-sm">
                <span>Research</span>
                <span>{stats.tokens.avgPerSession.research.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pilot</span>
                <span>{stats.tokens.avgPerSession.pilot.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Analysis Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
          <div className="text-3xl font-bold text-primary">
            ${stats.costs.total.toFixed(2)}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Research Sessions</span>
              <span>${stats.costs.research.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pilot Sessions</span>
              <span>${stats.costs.pilot.toFixed(2)}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Average per Session</div>
              <div className="flex justify-between text-sm">
                <span>Research</span>
                <span>${stats.costs.avgPerSession.research.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pilot</span>
                <span>${stats.costs.avgPerSession.pilot.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Peak Cost Period</div>
              <div className="text-sm font-medium">
                {stats.costs.peakPeriod.period}: ${stats.costs.peakPeriod.amount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Summary Table - Now with export button */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-primary">User Summary</h3>
          <button
            onClick={exportUserSummary}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" />
            <span>Export to Excel</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User/Research ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Messages
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transcripts.reduce((acc, transcript) => {
                const userId = transcript.isResearchSession ? transcript.anonymousId : transcript.userId;
                const existingUser = acc.find(u => u.id === userId);
                
                if (existingUser) {
                  existingUser.consultations += 1;
                  existingUser.totalCost += transcript.tokenMetrics?.totalCost || 0;
                  existingUser.totalMessages += transcript.messages?.filter(m => m.type === 'user').length || 0;
                } else {
                  acc.push({
                    id: userId,
                    isResearch: transcript.isResearchSession,
                    consultations: 1,
                    totalCost: transcript.tokenMetrics?.totalCost || 0,
                    totalMessages: transcript.messages?.filter(m => m.type === 'user').length || 0
                  });
                }
                return acc;
              }, [])
              .filter(user => 
                searchTerm === '' || 
                user.id.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.isResearch ? 'Research' : 'Pilot'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.consultations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${user.totalCost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.totalMessages}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consultation Costs Table - Now with export button */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-primary">Consultation Costs</h3>
          <button
            onClick={exportConsultations}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" />
            <span>Export to Excel</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User/Research ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transcripts
                .filter(t => 
                  searchTerm === '' || 
                  t.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  t.anonymousId?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((transcript) => (
                  <tr key={`${transcript.id}-${transcript.startTime?.getTime()}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.startTime?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.isResearchSession ? transcript.anonymousId : transcript.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.isResearchSession ? 'Research' : 'Pilot'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.tokenMetrics?.model || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round((transcript.endTime - transcript.startTime) / (1000 * 60))} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.messages?.filter(m => m.type === 'user').length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transcript.tokenMetrics?.totalTokens?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${transcript.tokenMetrics?.totalCost?.toFixed(4) || '0.0000'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => fetchTranscripts(true)}
              disabled={loading}
              className="w-full py-2 text-sm text-primary hover:text-primary-dark disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}