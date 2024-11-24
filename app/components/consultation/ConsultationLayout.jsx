import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/app/contexts/ChatContext';
import { useRouter } from 'next/navigation';
import MessageBubble from '../chat/MessageBubble';
import QuickActions from './QuickActions';
import SessionTimer from './SessionTimer';
import TourModal from './TourModal';
import { Button } from '../ui/button';
import { Send, Menu, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { generateAIResponse } from '@/app/utils/openai';

export default function ConsultationLayout() {
  const {
    messages,
    isLoading: chatIsLoading,
    sessionStarted,
    startNewSession,
    addMessage,
    endSession,
  } = useChat();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [showTourModal, setShowTourModal] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const messagesEndRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const [diagnosisDiscussed, setDiagnosisDiscussed] = useState(false);
  const [usedActions, setUsedActions] = useState(new Set());
  const [sectionHeaders, setSectionHeaders] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenConsultationTour');
    if (!hasSeenTour) {
      setShowTourModal(true);
    }
    
    const initializeChat = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      
      await startNewSession();
      // Add initial VP message without generating a response
      const initialResponse = "Hello, I'm not feeling well and I've come to see a doctor today.";
      await addMessage(initialResponse, false);
    };
    
    initializeChat();
    
    return () => {
      if (sessionStarted) {
        endSession();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sectionHeaders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input.trim();
    setInput('');
    setShowMobileControls(false); // Close mobile controls after sending message

    try {
      setIsSending(true);
      await addMessage(message, true);
      
      const aiResponse = await generateAIResponse(
        messages.concat([{ type: 'user', content: message }])
      );
      await addMessage(aiResponse, false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = async (action, prompt) => {
    if (action === 'end') {
      try {
        await endSession();
        router.push('/dashboard');
      } catch (error) {
        toast.error('Error ending session: ' + error.message);
      }
      return;
    }

    try {
      setIsSending(true);
      setShowMobileControls(false); // Close mobile controls after action
      
      let headerText = '';
      if (action === 'diagnosis') {
        headerText = 'Discussion of Diagnosis';
        setDiagnosisDiscussed(true);
      } else if (action === 'feedback') {
        headerText = 'Consultation Feedback';
        setUsedActions(prev => new Set([...prev, action]));
      } else if (action === 'questions') {
        headerText = 'Additional Questions to Consider';
        setUsedActions(prev => new Set([...prev, action]));
      }

      if (headerText) {
        setSectionHeaders(prev => [...prev, { text: headerText, index: messages.length }]);
      }

      await addMessage(prompt, true);
      
      const aiResponse = await generateAIResponse(
        messages.concat([{ type: 'user', content: prompt }]),
        action === 'diagnosis'
      );
      await addMessage(aiResponse, false);
    } catch (error) {
      console.error('Error in quick action:', error);
      toast.error('Error in quick action: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTour = () => {
    localStorage.setItem('hasSeenConsultationTour', 'true');
    setShowTourModal(false);
  };

  const getVisibleActions = () => {
    const baseActions = ['end'];
    if (!diagnosisDiscussed) {
      baseActions.unshift('diagnosis');
    } else {
      if (!usedActions.has('feedback')) baseActions.unshift('feedback');
      if (!usedActions.has('questions')) baseActions.unshift('questions');
    }
    return baseActions;
  };

  const renderMessages = () => {
    let renderedMessages = [];
    messages.forEach((message, index) => {
      const header = sectionHeaders.find(h => h.index === index);
      if (header) {
        renderedMessages.push(
          <div key={`header-${index}`} className="flex justify-center my-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <p className="text-sm font-semibold text-gray-700">{header.text}</p>
            </div>
          </div>
        );
      }
      
      renderedMessages.push(
        <MessageBubble
          key={`msg-${index}`}
          message={message.content}
          isUser={message.type === 'user'}
          timestamp={message.timestamp}
        />
      );
    });
    return renderedMessages;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {showTourModal && <TourModal onClose={handleCloseTour} />}
      
      {/* Header */}
      <div className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-semibold text-primary">Virtual Patient Consultation</h1>
        <div className="flex items-center gap-4">
          <SessionTimer startTime={startTimeRef.current} />
          <button
            onClick={() => setShowMobileControls(!showMobileControls)}
            className="md:hidden p-1 text-gray-600 hover:text-primary"
          >
            {showMobileControls ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Controls Overlay */}
      {showMobileControls && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileControls(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4" onClick={e => e.stopPropagation()}>
            <div className="h-full">
              <h2 className="text-lg font-semibold text-primary mb-4">Consultation Controls</h2>
              <QuickActions
                onAction={handleQuickAction}
                disabled={isSending || chatIsLoading}
                visibleActions={getVisibleActions()}
                diagnosisDiscussed={diagnosisDiscussed}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {renderMessages()}
              {isSending && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-sm">Virtual patient is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="bg-white border-t p-4">
            <div className="max-w-3xl mx-auto flex items-center space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSending || chatIsLoading}
              />
              <Button 
                type="submit" 
                disabled={isSending || chatIsLoading || !input.trim()}
                className="px-4 py-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </main>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-l bg-gray-50">
          <div className="h-full p-4">
            <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-primary">Consultation Controls</h2>
                {diagnosisDiscussed && (
                  <p className="text-sm text-gray-600 mt-2">
                    Review your consultation and gather feedback before ending.
                  </p>
                )}
              </div>
              
              <div className="flex-1 p-4">
                <QuickActions
                  onAction={handleQuickAction}
                  disabled={isSending || chatIsLoading}
                  visibleActions={getVisibleActions()}
                  diagnosisDiscussed={diagnosisDiscussed}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}