'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Search, Calendar, Download, Eye, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';

export default function TranscriptManager() {
  const [transcripts, setTranscripts] = useState({});
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [viewingTranscripts, setViewingTranscripts] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No timestamp';
    // Handle both Firestore Timestamp and regular Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const fetchTranscripts = async () => {
    try {
      const participantsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'research_participant'),
        where('hasConsented', '==', true)
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      const researchParticipants = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const transcriptsByParticipant = {};

      const transcriptPromises = researchParticipants.map(async (participant) => {
        try {
          const transcriptsQuery = query(
            collection(db, 'transcripts'),
            where('userId', '==', participant.id),
            where('isResearchSession', '==', true),
            orderBy('startTime', 'desc')
          );
          
          const transcriptsSnapshot = await getDocs(transcriptsQuery);
          
          if (!transcriptsSnapshot.empty) {
            transcriptsByParticipant[participant.anonymousId] = transcriptsSnapshot.docs.map(doc => {
              const data = doc.data();
              // Convert timestamps in messages
              const messages = data.messages?.map(msg => ({
                ...msg,
                timestamp: msg.timestamp?.toDate?.() || new Date(msg.timestamp)
              })) || [];

              return {
                id: doc.id,
                ...data,
                startTime: data.startTime?.toDate?.() || new Date(),
                endTime: data.endTime?.toDate?.() || new Date(),
                messages
              };
            });
          } else {
            transcriptsByParticipant[participant.anonymousId] = [];
          }
        } catch (error) {
          console.error(`Error fetching transcripts for participant ${participant.anonymousId}:`, error);
          transcriptsByParticipant[participant.anonymousId] = [];
          toast.error(`Error loading transcripts for participant ${participant.anonymousId}`);
        }
      });

      await Promise.all(transcriptPromises);

      setParticipants(researchParticipants);
      setTranscripts(transcriptsByParticipant);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast.error('Error loading transcripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const getFilteredParticipants = () => {
    return participants.filter(participant =>
      participant.anonymousId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getAllTranscriptsForParticipant = (participant) => {
    const participantTranscripts = transcripts[participant.anonymousId] || [];
    
    if (dateFilter === 'all') return participantTranscripts;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.setDate(now.getDate() - 7));
    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

    return participantTranscripts.filter(t => {
      const transcriptDate = t.startTime;
      switch (dateFilter) {
        case 'today':
          return transcriptDate >= today;
        case 'week':
          return transcriptDate >= weekAgo;
        case 'month':
          return transcriptDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const downloadTranscriptBundle = async (participant) => {
    try {
      const participantTranscripts = getAllTranscriptsForParticipant(participant);
      if (participantTranscripts.length === 0) {
        toast.info('No transcripts available for this participant');
        return;
      }

      const pdf = new jsPDF();
      
      // Add cover page
      pdf.setFontSize(24);
      pdf.text("Research Participant Transcripts", 20, 40);

      pdf.setFontSize(14);
      pdf.text(`Research ID: ${participant.anonymousId}`, 20, 70);
      pdf.text(`Total Sessions: ${participantTranscripts.length}`, 20, 85);
      pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 100);

      // Add sessions summary
      pdf.text("Session Summary:", 20, 120);
      let summaryY = 135;
      participantTranscripts.forEach((t, idx) => {
        const duration = Math.round((t.endTime - t.startTime) / 60000);
        const date = t.startTime.toLocaleDateString();
        const summary = `Session ${idx + 1}: ${date} (${duration} minutes)`;
        pdf.text(summary, 25, summaryY);
        summaryY += 10;
        
        if (summaryY > 270) {
          pdf.addPage();
          summaryY = 30;
        }
      });

      // Add each transcript
      participantTranscripts.forEach((transcript, index) => {
        pdf.addPage();
        
        // Session header
        pdf.setFontSize(18);
        pdf.text(`Session ${index + 1}`, 20, 30);
        
        // Session details
        pdf.setFontSize(12);
        pdf.text(`Date: ${transcript.startTime.toLocaleString()}`, 20, 45);
        pdf.text(`Duration: ${Math.round((transcript.endTime - transcript.startTime) / 60000)} minutes`, 20, 55);
        pdf.text(`Total Messages: ${transcript.messages.length}`, 20, 65);
        
        let yPosition = 85;
        
        // Add messages
        transcript.messages.forEach(msg => {
          const prefix = msg.type === 'user' ? 'Student' : 'Virtual Patient';
          const timestamp = msg.timestamp.toLocaleTimeString();
          const fullText = `${prefix} (${timestamp}): ${msg.content}`;
          
          const lines = pdf.splitTextToSize(fullText, 170);
          
          if (yPosition + (lines.length * 7) > 270) {
            pdf.addPage();
            yPosition = 30;
          }
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${prefix}:`, 20, yPosition);
          pdf.setFont('helvetica', 'normal');
          
          pdf.setTextColor(100);
          pdf.text(`(${timestamp})`, 60, yPosition);
          pdf.setTextColor(0);
          
          yPosition += 7;
          
          lines.forEach(line => {
            pdf.text(line, 25, yPosition);
            yPosition += 7;
          });
          
          yPosition += 5;
        });
      });

      pdf.save(`AIVP_Research_${participant.anonymousId}_Transcripts.pdf`);
      toast.success('Transcripts bundle downloaded successfully');
    } catch (error) {
      console.error('Error downloading transcripts:', error);
      toast.error('Error downloading transcripts');
    }
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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by Research ID..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Research Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Research ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latest Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredParticipants().map((participant) => {
                const participantTranscripts = getAllTranscriptsForParticipant(participant);
                const totalDuration = participantTranscripts.reduce((acc, t) => 
                  acc + Math.round((t.endTime - t.startTime) / 60000), 0
                );
                const latestSession = participantTranscripts[0]?.startTime;

                return (
                  <tr key={participant.anonymousId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.anonymousId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {participantTranscripts.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {latestSession ? latestSession.toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {totalDuration} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setViewingTranscripts(true);
                        }}
                        className="text-primary hover:text-secondary mr-4"
                        title="View Transcripts"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => downloadTranscriptBundle(participant)}
                        className="text-primary hover:text-secondary"
                        title="Download All Transcripts"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Viewer Modal */}
      {viewingTranscripts && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  Research ID: {selectedParticipant.anonymousId}
                </h3>
                <button
                  onClick={() => {
                    setViewingTranscripts(false);
                    setSelectedParticipant(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {getAllTranscriptsForParticipant(selectedParticipant).map((transcript, index) => (
                  <div key={transcript.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Session {index + 1}</h4>
                      <span className="text-sm text-gray-500">
                        {transcript.startTime.toLocaleString()}
                      </span>
                      </div>
                    
                    <div className="space-y-4">
                      {transcript.messages.map((message, msgIndex) => (
                        <div
                          key={msgIndex}
                          className={`p-3 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-primary text-white ml-auto max-w-[80%]'
                              : 'bg-gray-100 mr-auto max-w-[80%]'
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">
                            {message.type === 'user' ? 'Student' : 'Virtual Patient'}
                          </p>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-75">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}