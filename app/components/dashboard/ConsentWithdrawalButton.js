'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import WithdrawalDialog from '../dialogs/WithdrawalDialog';
import { AlertCircle, FileKey, Info, ClipboardList } from 'lucide-react';

export default function ConsentWithdrawalButton() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showIdInfo, setShowIdInfo] = useState(false);

  if (user?.role !== 'research_participant') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-primary">Research Participation</h2>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          Withdraw from Study
        </button>
      </div>

      {/* Research ID Section */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <FileKey className="h-5 w-5 text-primary mt-1" />
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 font-medium">Research ID</span>
            <button
              onClick={() => setShowIdInfo(!showIdInfo)}
              className="text-primary hover:text-primary/80 p-1"
              title={showIdInfo ? "Hide information" : "Show information"}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-gray-100">
            {user.anonymousId || 'Not assigned'}
          </div>
        </div>
      </div>

      {/* Research ID Information Dropdown */}
      {showIdInfo && (
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2">About Your Research ID</h4>
          <p className="mb-3">
            This unique identifier helps protect your privacy whilst participating in the research. It allows us to:
          </p>
          <ul className="space-y-2">
            {[
              'Collect your platform data without using personal information',
              'Keep your research data separate from your identity',
              'Process withdrawal requests if needed',
              'Maintain research records securely'
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-blue-700">
            The research team uses this ID to track your participation, but published research will use different anonymisation methods to further protect your privacy.
          </p>
        </div>
      )}

      {/* Withdrawal Dialog */}
      {showDialog && (
        <WithdrawalDialog 
          open={showDialog} 
          onClose={() => setShowDialog(false)} 
        />
      )}
    </div>
  );
}