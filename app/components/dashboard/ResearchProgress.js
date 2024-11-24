'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { db } from '@/app/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ClipboardList, Users, MessageCircle } from 'lucide-react';

export default function ResearchProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({
    hasCompletedSurvey: false,
    hasScheduledInterview: false,
    sessionsCompleted: 0,
    requiredSessions: 5  // Example minimum sessions
  });

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        setProgress(prev => ({
          ...prev,
          hasCompletedSurvey: userData?.surveyCompleted || false,
          hasScheduledInterview: userData?.interviewScheduled || false,
          sessionsCompleted: userData?.sessionsCompleted || 0
        }));
      } catch (error) {
        console.error('Error fetching research progress:', error);
      }
    };

    fetchProgress();
  }, [user]);

  const calculateProgress = () => {
    let completed = 0;
    if (progress.hasCompletedSurvey) completed++;
    if (progress.sessionsCompleted >= progress.requiredSessions) completed++;
    if (progress.hasScheduledInterview) completed++;
    return (completed / 3) * 100;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-primary mb-4">Research Progress</h2>
      
      <div className="space-y-4">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary bg-opacity-10">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary">
                {calculateProgress()}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary bg-opacity-10">
            <div 
              style={{ width: `${calculateProgress()}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
            ></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <ClipboardList className={`h-5 w-5 mr-3 ${progress.hasCompletedSurvey ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={progress.hasCompletedSurvey ? 'line-through text-gray-500' : ''}>
              Complete initial survey
            </span>
          </div>

          <div className="flex items-center">
            <Users className={`h-5 w-5 mr-3 ${progress.sessionsCompleted >= progress.requiredSessions ? 'text-green-500' : 'text-gray-400'}`} />
            <span>
              Complete {progress.requiredSessions} AI-VP sessions ({progress.sessionsCompleted} done)
            </span>
          </div>

          <div className="flex items-center">
            <MessageCircle className={`h-5 w-5 mr-3 ${progress.hasScheduledInterview ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={progress.hasScheduledInterview ? 'line-through text-gray-500' : ''}>
              Schedule research interview
            </span>
          </div>
        </div>

        {!progress.hasCompletedSurvey && (
          <div className="mt-4">
            <button 
              onClick={() => window.open('/survey', '_blank')}
              className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-secondary transition duration-300"
            >
              Complete Survey
            </button>
          </div>
        )}

        {!progress.hasScheduledInterview && progress.sessionsCompleted >= progress.requiredSessions && (
          <div className="mt-4">
            <button 
              onClick={() => window.open('/schedule-interview', '_blank')}
              className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-secondary transition duration-300"
            >
              Schedule Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}