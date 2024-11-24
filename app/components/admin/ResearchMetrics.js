'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Download, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ResearchMetrics() {
  const [metrics, setMetrics] = useState({
    participantGrowth: [],
    sessionDistribution: {},
    averageSessionDuration: [],
    messageMetrics: [],
    engagementFrequency: [],
    rawData: {
      participants: [],
      sessions: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const tooltipContent = {
    participantGrowth: "Shows the cumulative number of research participants over time, tracking both new enrollments and total participant count.",
    sessionDistribution: "Displays how research participant sessions are distributed across different times of day, helping identify peak usage periods.",
    averageSessionDuration: "Calculates the mean duration of research participant consultations over time, measured from session start to end.",
    messageMetrics: "Tracks the average number of messages sent by research participants per consultation.",
    engagementFrequency: "Shows the average time between sessions for research participants, helping measure consistent engagement.",
  };

  // Helper Functions for Metric Calculations
  const ensureDate = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return null;
  };

  const calculateAverageSessionDurationForParticipant = (anonymousId) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === anonymousId);
    if (participantSessions.length === 0) return 0;
    const totalDuration = participantSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    return Math.round(totalDuration / participantSessions.length);
  };

  const calculateTotalTimeSpent = (anonymousId) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === anonymousId);
    return participantSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  };

  const calculateTotalMessages = (anonymousId) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === anonymousId);
    return participantSessions.reduce((acc, s) => acc + (s.messageCount || 0), 0);
  };

  const calculateAverageMessages = (anonymousId) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === anonymousId);
    if (participantSessions.length === 0) return 0;
    const totalMessages = participantSessions.reduce((acc, s) => acc + (s.messageCount || 0), 0);
    return Math.round(totalMessages / participantSessions.length);
  };

  const getLastActiveDate = (anonymousId) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === anonymousId)
      .sort((a, b) => b.date?.getTime() - a.date?.getTime());
    return participantSessions[0]?.date?.toLocaleDateString() || 'Never';
  };

  const calculateTimeSinceLastSession = (session) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === session.anonymousId)
      .sort((a, b) => a.date?.getTime() - b.date?.getTime());
    const sessionIndex = participantSessions.findIndex(s => 
      s.date?.getTime() === session.date?.getTime()
    );
    if (sessionIndex <= 0) return 'N/A';
    const previousSession = participantSessions[sessionIndex - 1];
    if (!previousSession.date || !session.date) return 'N/A';
    return Math.round((session.date - previousSession.date) / (1000 * 60 * 60 * 24));
  };

  const getSessionNumber = (session) => {
    const participantSessions = metrics.rawData.sessions
      .filter(s => s.anonymousId === session.anonymousId)
      .sort((a, b) => a.date?.getTime() - b.date?.getTime());
    return participantSessions.findIndex(s => 
      s.date?.getTime() === session.date?.getTime()
    ) + 1;
  };

  const calculateSessionIntervals = (sessions) => {
    const sessionsByParticipant = {};
    sessions.forEach(session => {
      if (!sessionsByParticipant[session.anonymousId]) {
        sessionsByParticipant[session.anonymousId] = [];
      }
      if (session.date) {
        sessionsByParticipant[session.anonymousId].push(session);
      }
    });

    const intervals = [];
    Object.entries(sessionsByParticipant).forEach(([anonymousId, userSessions]) => {
      const sortedSessions = userSessions.sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      for (let i = 1; i < sortedSessions.length; i++) {
        intervals.push({
          'Research ID': anonymousId,
          'Session Number': i + 1,
          'Previous Session Date': sortedSessions[i-1].date.toLocaleDateString(),
          'Current Session Date': sortedSessions[i].date.toLocaleDateString(),
          'Days Between': Math.round(
            (sortedSessions[i].date - sortedSessions[i-1].date) / (1000 * 60 * 60 * 24)
          )
        });
      }
    });
    return intervals;
  };

  const calculateParticipantGrowth = (users) => {
    const months = {};
    users.forEach(user => {
      if (user.createdAt) {
        const monthYear = user.createdAt.toLocaleString('default', { month: 'short', year: '2-digit' });
        months[monthYear] = (months[monthYear] || 0) + 1;
      }
    });

    return Object.entries(months).map(([month, count], index, arr) => ({
      month,
      newParticipants: count,
      cumulative: arr.slice(0, index + 1).reduce((sum, [_, c]) => sum + c, 0)
    }));
  };

  const calculateSessionDistribution = (transcripts) => {
    const hourlyDistribution = Array(24).fill(0);
    transcripts.forEach(transcript => {
      if (transcript.startTime) {
        const hour = transcript.startTime.getHours();
        hourlyDistribution[hour]++;
      }
    });
    return hourlyDistribution;
  };

  const calculateAverageSessionDuration = (transcripts) => {
    const durations = transcripts
      .filter(t => t.startTime && t.endTime)
      .map(t => ({
        date: t.startTime.toLocaleDateString(),
        duration: Math.round((t.endTime - t.startTime) / (1000 * 60))
      }));

    const avgByDate = {};
    durations.forEach(({ date, duration }) => {
      if (!avgByDate[date]) {
        avgByDate[date] = { total: 0, count: 0 };
      }
      avgByDate[date].total += duration;
      avgByDate[date].count++;
    });

    return Object.entries(avgByDate).map(([date, { total, count }]) => ({
      date,
      averageDuration: Math.round(total / count)
    }));
  };

  const calculateMessageMetrics = (transcripts) => {
    return transcripts
      .filter(t => t.startTime && t.messages)
      .map(t => ({
        date: t.startTime.toLocaleDateString(),
        messageCount: t.messages.filter(m => m.type === 'user').length
      }));
  };

  const calculateEngagementFrequency = (transcripts) => {
    const userSessions = {};
    
    transcripts.forEach(t => {
      if (t.startTime && t.anonymousId) {
        if (!userSessions[t.anonymousId]) {
          userSessions[t.anonymousId] = [];
        }
        userSessions[t.anonymousId].push(t.startTime);
      }
    });

    const intervals = [];
    Object.values(userSessions).forEach(sessions => {
      if (sessions.length < 2) return;
      
      sessions.sort((a, b) => a - b);
      for (let i = 1; i < sessions.length; i++) {
        const interval = (sessions[i] - sessions[i-1]) / (1000 * 60 * 60 * 24);
        intervals.push(interval);
      }
    });

    return intervals;
  };

  const fetchMetrics = async () => {
    try {
      // Fetch only research participant data
      const usersRef = collection(db, 'users');
      const researchQuery = query(usersRef, where('role', '==', 'research_participant'));
      const usersSnapshot = await getDocs(researchQuery);
      
      const researchUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: ensureDate(doc.data().createdAt)
      }));

      // Fetch their transcripts
      const transcriptsData = [];
      for (const user of researchUsers) {
        const transcriptsRef = collection(db, 'transcripts');
        const transcriptsQuery = query(transcriptsRef, 
          where('userId', '==', user.id),
          where('isResearchSession', '==', true)
        );
        const transcriptsSnapshot = await getDocs(transcriptsQuery);
        
        transcriptsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          transcriptsData.push({
            ...data,
            transcriptId: doc.id,
            anonymousId: user.anonymousId,
            startTime: ensureDate(data.startTime),
            endTime: ensureDate(data.endTime),
            messages: data.messages || []
          });
        });
      }

      // Calculate metrics
      const participantGrowth = calculateParticipantGrowth(researchUsers);
      const sessionDistribution = calculateSessionDistribution(transcriptsData);
      const averageSessionDuration = calculateAverageSessionDuration(transcriptsData);
      const messageMetrics = calculateMessageMetrics(transcriptsData);
      const engagementFrequency = calculateEngagementFrequency(transcriptsData);

      // Prepare raw data for export
      const rawData = prepareRawData(researchUsers, transcriptsData);

      setMetrics({
        participantGrowth,
        sessionDistribution,
        averageSessionDuration,
        messageMetrics,
        engagementFrequency,
        rawData
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Error loading research metrics');
    } finally {
      setLoading(false);
    }
  };

  const prepareRawData = (users, transcripts) => {
    return {
      participants: users
        .filter(user => user.anonymousId)
        .map(user => ({
          anonymousId: user.anonymousId,
          joinDate: user.createdAt || new Date(),
          totalSessions: transcripts.filter(t => t.anonymousId === user.anonymousId).length
        })),
      sessions: transcripts
        .filter(t => t.startTime && t.endTime)
        .map(t => ({
          anonymousId: t.anonymousId,
          date: t.startTime,
          duration: Math.round((t.endTime - t.startTime) / (1000 * 60)),
          messageCount: t.messages?.filter(m => m.type === 'user').length || 0,
          totalMessages: t.messages?.length || 0
        }))
    };
  };

  const exportMetrics = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Participants Summary Sheet
      const participantsData = metrics.rawData.participants.map(p => ({
        'Research ID': p.anonymousId,
        'Join Date': p.joinDate instanceof Date ? p.joinDate.toLocaleDateString() : 'N/A',
        'Total Sessions': p.totalSessions,
        'Average Session Duration (mins)': calculateAverageSessionDurationForParticipant(p.anonymousId),
        'Total Time Spent (mins)': calculateTotalTimeSpent(p.anonymousId),
        'Total Messages Sent': calculateTotalMessages(p.anonymousId),
        'Average Messages Per Session': calculateAverageMessages(p.anonymousId),
        'Last Active': getLastActiveDate(p.anonymousId)
      }));
      
      const participantsSheet = XLSX.utils.json_to_sheet(participantsData);
      XLSX.utils.book_append_sheet(workbook, participantsSheet, 'Participants Summary');

      // Detailed Sessions Sheet
      const sessionsData = metrics.rawData.sessions.map(s => ({
        'Research ID': s.anonymousId,
        'Session Date': s.date instanceof Date ? s.date.toLocaleDateString() : 'N/A',
        'Session Time': s.date instanceof Date ? s.date.toLocaleTimeString() : 'N/A',
        'Duration (minutes)': s.duration,
        'Student Messages': s.messageCount,
        'Total Messages': s.totalMessages,
        'Time Since Last Session (days)': calculateTimeSinceLastSession(s),
        'Session Number': getSessionNumber(s)
      }));
      const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData);
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Detailed Sessions');

      // Session Intervals Sheet
      const intervalData = calculateSessionIntervals(metrics.rawData.sessions);
      const intervalsSheet = XLSX.utils.json_to_sheet(intervalData);
      XLSX.utils.book_append_sheet(workbook, intervalsSheet, 'Session Intervals');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(data, `research-metrics-${timestamp}.xlsx`);
      
      toast.success('Metrics exported successfully');
    } catch (error) {
      console.error('Error exporting metrics:', error);
      toast.error('Error exporting metrics');
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={exportMetrics}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition duration-200 flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          Export Raw Data
        </button>
      </div>

      {/* Participant Growth Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Participant Growth</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setActiveTooltip(activeTooltip === 'participantGrowth' ? null : 'participantGrowth')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
        
        {activeTooltip === 'participantGrowth' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {tooltipContent.participantGrowth}
          </div>
        )}

        <Line
          data={{
            labels: metrics.participantGrowth.map(d => d.month),
            datasets: [
              {
                label: 'New Participants',
                data: metrics.participantGrowth.map(d => d.newParticipants),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
              },
              {
                label: 'Total Participants',
                data: metrics.participantGrowth.map(d => d.cumulative),
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top'
              }
            }
          }}
        />
      </div>

      {/* Session Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Session Distribution</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setActiveTooltip(activeTooltip === 'sessionDistribution' ? null : 'sessionDistribution')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {activeTooltip === 'sessionDistribution' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {tooltipContent.sessionDistribution}
          </div>
        )}

        <Bar
          data={{
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [
              {
                label: 'Sessions',
                data: metrics.sessionDistribution,
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Number of Sessions'
                }
              }
            }
          }}
        />
      </div>

      {/* Session Duration Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Average Session Duration</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setActiveTooltip(activeTooltip === 'averageSessionDuration' ? null : 'averageSessionDuration')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {activeTooltip === 'averageSessionDuration' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {tooltipContent.averageSessionDuration}
          </div>
        )}

        <Line
          data={{
            labels: metrics.averageSessionDuration.map(d => d.date),
            datasets: [
              {
                label: 'Average Duration (minutes)',
                data: metrics.averageSessionDuration.map(d => d.averageDuration),
                borderColor: 'rgb(153, 102, 255)',
                tension: 0.1
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Minutes'
                }
              }
            }
          }}
        />
      </div>

      {/* Messages per Session Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Messages per Session</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setActiveTooltip(activeTooltip === 'messageMetrics' ? null : 'messageMetrics')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {activeTooltip === 'messageMetrics' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {tooltipContent.messageMetrics}
          </div>
        )}

        <Line
          data={{
            labels: metrics.messageMetrics.map(d => d.date),
            datasets: [
              {
                label: 'Messages per Session',
                data: metrics.messageMetrics.map(d => d.messageCount),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Number of Messages'
                }
              }
            }
          }}
        />
      </div>

      {/* Engagement Frequency Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Time Between Sessions</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setActiveTooltip(activeTooltip === 'engagementFrequency' ? null : 'engagementFrequency')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {activeTooltip === 'engagementFrequency' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {tooltipContent.engagementFrequency}
          </div>
        )}

        {metrics.engagementFrequency.length > 0 ? (
          <Bar
            data={{
              labels: ['0-1', '1-3', '3-7', '7-14', '14+'],
              datasets: [
                {
                  label: 'Number of Intervals',
                  data: [
                    metrics.engagementFrequency.filter(d => d <= 1).length,
                    metrics.engagementFrequency.filter(d => d > 1 && d <= 3).length,
                    metrics.engagementFrequency.filter(d => d > 3 && d <= 7).length,
                    metrics.engagementFrequency.filter(d => d > 7 && d <= 14).length,
                    metrics.engagementFrequency.filter(d => d > 14).length,
                  ],
                  backgroundColor: 'rgba(255, 159, 64, 0.6)'
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Days Between Sessions'
                  }
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Frequency'
                  }
                }
              }
            }}
          />
        ) : (
          <div className="text-center text-gray-500 py-8">
            Not enough data to calculate engagement intervals
          </div>
        )}
      </div>
    </div>
  );
}