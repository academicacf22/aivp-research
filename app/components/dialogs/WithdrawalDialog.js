'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { withdrawConsent } from '@/app/utils/withdrawalHelpers';
import { toast } from 'react-toastify';

export default function WithdrawalDialog({ open, onClose }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);

  const handleWithdraw = async () => {
    if (!understood) {
      toast.error('Please confirm you understand the implications of withdrawal');
      return;
    }

    setLoading(true);
    try {
      await withdrawConsent(user.uid, reason);
      toast.success('Successfully withdrawn from research study');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      toast.error('Error withdrawing consent: ' + error.message);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-red-600">
            Withdraw from Research Study
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">
              Please understand that withdrawing from the research study will:
            </p>
            <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
              <li>Remove you from the research participant group</li>
              <li>Anonymize your existing research data</li>
              <li>Prevent future data collection for research</li>
              <li>Allow you to continue using the platform as a pilot participant</li>
              <li>Allow you to rejoin the research later with a new research ID if you wish</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Reason for withdrawal (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-24 p-2 border rounded-md"
              placeholder="Please let us know why you're withdrawing (this helps improve our research process)"
            />
          </div>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-600">
              I understand that withdrawing from the research study will anonymize my existing
              research data, and any future platform usage will not be included in the research
              unless I choose to rejoin the study later.
            </span>
          </label>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              disabled={loading || !understood}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Confirm Withdrawal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}