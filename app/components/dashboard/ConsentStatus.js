'use client';

import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { canReconsent } from '@/app/utils/withdrawalHelpers';
import { useEffect, useState } from 'react';

export default function ConsentStatus() {
  const router = useRouter();
  const { user } = useAuth();
  const [canReconsentState, setCanReconsentState] = useState(false);

  useEffect(() => {
    const checkReconsentEligibility = async () => {
      if (user?.uid) {
        const eligible = await canReconsent(user.uid);
        setCanReconsentState(eligible);
      }
    };

    checkReconsentEligibility();
  }, [user]);

  if (!user || user.role !== 'pilot_participant') {
    return null;
  }

  // If user has never withdrawn, show original consent message
  if (!user.consentWithdrawnAt) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Research Participation Opportunity
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                You're currently using the AI-VP platform as part of our pilot program. 
                Would you like to contribute to our research study? Your participation would help 
                us understand how AI can enhance medical education.
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/consent')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Learn More About the Research
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has withdrawn and can reconsent
  if (canReconsentState) {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Rejoin Research Study
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                You previously withdrew from the research study. You're welcome to rejoin 
                if you'd like to contribute to our research again. If you rejoin, you'll 
                receive a new research ID and only future interactions will be included 
                in the study.
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/consent')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Rejoin Research Study
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
