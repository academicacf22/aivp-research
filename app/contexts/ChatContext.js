'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { jsPDF } from 'jspdf';
import { generateAIResponse } from '../utils/openai';
import { toast } from 'react-toastify';

const ChatContext = createContext({});

export const useChat = () => useContext(ChatContext);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isDiagnosisMode, setIsDiagnosisMode] = useState(false);
  const sessionRef = useRef(null);

  const generateAnonymousId = () => {
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RP-${timestamp}-${randomStr}`;
  };

  const startNewSession = async () => {
    setMessages([]);
    setSessionStarted(true);
    setIsDiagnosisMode(false);
    setIsLoading(true);
    
    try {
      const isResearchParticipant = user?.role === 'research_participant';
      const sessionId = Date.now().toString();
      const anonymousId = isResearchParticipant ? 
        (user.anonymousId || generateAnonymousId()) : null;

      sessionRef.current = {
        id: sessionId,
        startTime: new Date(),
        messages: [],
        anonymousId,
        isResearchSession: isResearchParticipant,
        userId: user.uid
      };

      const sessionDoc = await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        anonymousId,
        startTime: serverTimestamp(),
        isResearchSession: isResearchParticipant,
        status: 'active'
      });

      sessionRef.current.docId = sessionDoc.id;

      if (isResearchParticipant && !user.anonymousId) {
        await updateDoc(doc(db, 'users', user.uid), {
          anonymousId
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Error starting session: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async (content, isUser = true) => {
    if (!sessionRef.current) return;

    const timestamp = new Date();
    const newMessage = {
      content,
      timestamp,
      type: isUser ? 'user' : 'ai'
    };

    setMessages(prev => [...prev, newMessage]);
    sessionRef.current.messages.push(newMessage);

    if (sessionRef.current.docId) {
      try {
        await updateDoc(doc(db, 'sessions', sessionRef.current.docId), {
          messages: sessionRef.current.messages,
          lastUpdated: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating session:', error);
      }
    }

    return newMessage;
  };

  const saveTranscript = async () => {
    if (!sessionRef.current) return;

    try {
      const endTime = new Date();
      const duration = Math.round((endTime - sessionRef.current.startTime) / 1000 / 60);
      
      const sessionData = {
        userId: user.uid,
        anonymousId: sessionRef.current.anonymousId,
        startTime: sessionRef.current.startTime,
        endTime: endTime,
        duration: duration, // Add duration field
        messages: sessionRef.current.messages,
        isResearchSession: sessionRef.current.isResearchSession,
        messageCount: sessionRef.current.messages.length, // Add message count
        metadata: {
          userRole: user.role,
          consultationLength: duration,
          messageCount: sessionRef.current.messages.length,
          diagnosisDiscussed: isDiagnosisMode
        }
      };

      // Save to transcripts collection
      const transcriptRef = await addDoc(collection(db, 'transcripts'), sessionData);

      // Update session status
      if (sessionRef.current.docId) {
        await updateDoc(doc(db, 'sessions', sessionRef.current.docId), {
          status: 'completed',
          endTime: serverTimestamp(),
          duration: duration,
          messageCount: sessionRef.current.messages.length
        });
      }

      // Generate PDF
      const pdf = new jsPDF();
      
      pdf.setFontSize(16);
      pdf.text("AI Virtual Patient Consultation Transcript", 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
      pdf.text(`Duration: ${duration} minutes`, 20, 40);
      if (sessionData.isResearchSession) {
        pdf.text(`Research ID: ${sessionData.anonymousId}`, 20, 50);
      }
      pdf.text(`Session ID: ${transcriptRef.id}`, 20, 60);

      let yPosition = 80;
      
      sessionData.messages.forEach(msg => {
        const prefix = msg.type === 'user' ? 'Student' : 'Virtual Patient';
        const fullText = `${prefix} (${new Date(msg.timestamp).toLocaleTimeString()}): ${msg.content}`;
        
        const lines = pdf.splitTextToSize(fullText, 170);
        
        if (yPosition + (lines.length * 7) > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        
        lines.forEach(line => {
          pdf.text(line, 20, yPosition);
          yPosition += 7;
        });
        
        yPosition += 5;
      });

      const fileName = sessionData.isResearchSession ? 
        `AIVP_Research_${sessionData.anonymousId}_${transcriptRef.id}.pdf` :
        `AIVP_Pilot_${transcriptRef.id}.pdf`;

      pdf.save(fileName);

      return transcriptRef.id;
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  };

  const enterDiagnosisMode = async () => {
    setIsDiagnosisMode(true);
    try {
      const response = await generateAIResponse(
        messages,
        true
      );
      await addMessage(response, false);
    } catch (error) {
      console.error('Error entering diagnosis mode:', error);
      throw error;
    }
  };

  const endSession = async () => {
    if (sessionStarted) {
      await saveTranscript();
      setSessionStarted(false);
      setIsDiagnosisMode(false);
      sessionRef.current = null;
      setMessages([]);
    }
  };

  const value = {
    messages,
    isLoading,
    sessionStarted,
    isDiagnosisMode,
    startNewSession,
    addMessage,
    endSession,
    enterDiagnosisMode
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}