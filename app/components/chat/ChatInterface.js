'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/app/contexts/ChatContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Loader2, Send, Download, X, MessageSquare, PlusCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { toast } from 'react-toastify';
import { generateAIResponse } from '@/app/utils/openai';

export default function ChatInterface() {
  const { 
    messages, 
    isLoading, 
    sessionStarted,
    isDiagnosisMode,
    startNewSession,
    addMessage,
    endSession,
    enterDiagnosisMode
  } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartSession = async () => {
    try {
      await startNewSession();
    } catch (error) {
      toast.error('Error starting session. Please try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending || !sessionStarted) return;

    try {
      setIsSending(true);
      await addMessage(message, true);
      setInput('');

      const aiResponse = await generateAIResponse(
        messages.concat([{ type: 'user', content: message }]),
        isDiagnosisMode
      );
      await addMessage(aiResponse, false);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Error sending message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      toast.success('Session ended. Transcript saved.');
    } catch (error) {
      toast.error('Error ending session: ' + error.message);
    }
  };

  const handleEnterDiagnosisMode = async () => {
    try {
      await enterDiagnosisMode();
    } catch (error) {
      toast.error('Error entering diagnosis mode: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-primary p-4 text-white flex justify-between items-center">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-semibold">
            {sessionStarted ? 'Virtual Patient Consultation' : 'Start New Consultation'}
          </h2>
        </div>
        {sessionStarted && (
          <div className="flex items-center space-x-2">
            {!isDiagnosisMode && (
              <button
                onClick={handleEnterDiagnosisMode}
                className="text-white hover:text-secondary transition-colors p-2 rounded-lg"
                title="Discuss Diagnosis"
              >
                <span className="text-sm">Dx</span>
              </button>
            )}
            <button
              onClick={handleEndSession}
              className="text-white hover:text-red-200 transition-colors"
              title="End Consultation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message.content}
            isUser={message.type === 'user'}
            timestamp={message.timestamp}
          />
        ))}
        {isSending && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Virtual patient is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!sessionStarted ? (
        <div className="p-4 border-t">
          <button
            onClick={handleStartSession}
            className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition duration-300 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <PlusCircle className="h-5 w-5 mr-2" />
            )}
            Start New Consultation
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isDiagnosisMode
                  ? "Enter your diagnosis and reasoning..."
                  : "Type your message..."
              }
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="bg-primary text-white p-2 rounded-lg hover:bg-secondary transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSending ? "Sending..." : "Send Message"}
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          {isDiagnosisMode && (
            <p className="mt-2 text-sm text-gray-500">
              Please provide your diagnosis and explain your reasoning based on the history you've gathered.
            </p>
          )}
        </form>
      )}
    </div>
  );
}