'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { logConsentChange } from '@/app/utils/auditLog';

export default function ConsentForm() {
  const { user, updateConsent } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isReconsent, setIsReconsent] = useState(false);
  const [consents, setConsents] = useState({
    readInfo: false,
    voluntary: false,
    platformData: false,
    interview: false,
    dataStorage: false,
    futureResearch: false,
    participation: false,
    futureContact: false
  });

  useEffect(() => {
    // Check if this is a re-consent scenario
    if (user?.consentWithdrawnAt) {
      setIsReconsent(true);
    }
  }, [user]);

  const handleMainConsent = async (e) => {
    e.preventDefault();
    console.log('Handling main consent...'); // Debug log
    
    if (!user?.uid) {
      console.error('No user ID found');
      toast.error('Authentication error. Please try logging in again.');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating Firestore...'); // Debug log

      // Generate anonymous research ID
      const anonymousId = `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store consent record
      await addDoc(collection(db, 'consent_history'), {
        userId: user.uid,
        anonymousId,
        type: isReconsent ? 'reconsent' : 'initial_consent',
        timestamp: new Date(),
        consents: {
          ...consents,
          consentDate: new Date().toISOString()
        }
      });

      // Update user document with consent details
      await setDoc(doc(db, 'users', user.uid), {
        role: 'research_participant',
        anonymousId: anonymousId,
        consents: {
          ...consents,
          consentDate: new Date().toISOString()
        },
        hasConsented: true,
        consentTimestamp: new Date(),
        lastUpdated: new Date(),
        profileComplete: isReconsent ? true : false,
        consentWithdrawnAt: null // Clear withdrawal timestamp if it exists
      }, { merge: true });

      // Create new research participant entry
      await addDoc(collection(db, 'research_participants'), {
        userId: user.uid,
        anonymousId,
        createdAt: new Date(),
        consents: {
          ...consents,
          consentDate: new Date().toISOString()
        },
        isReconsent
      });

      await logConsentChange(user.uid, isReconsent ? 'reconsent' : 'initial_consent', {
        timestamp: new Date(),
        success: true,
        anonymousId
      });

      console.log('Firestore updated, calling updateConsent...'); // Debug log

      await updateConsent(true);
      
      console.log('Consent updated, redirecting...'); // Debug log
      toast.success(isReconsent ? 
        'Thank you for rejoining the research study.' : 
        'Thank you for agreeing to participate in the research.'
      );
      
      // Route based on whether this is initial consent or re-consent
      router.push(isReconsent ? '/dashboard' : '/research-profile');
    } catch (error) {
      console.error('Error in handleMainConsent:', error); // Debug log
      toast.error('Error saving consent: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setLoading(true);
      await setDoc(doc(db, 'users', user.uid), {
        role: 'pilot_participant',
        consentDeclined: new Date().toISOString(),
        lastUpdated: new Date()
      }, { merge: true });
      
      toast.info('Continuing as pilot participant');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error in handleDecline:', error);
      toast.error('Error updating status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAllConsentsChecked = Object.values(consents).every(Boolean);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold text-primary mb-6">
        {isReconsent ? 'Rejoin Research Study' : 'Research Participation Information & Consent'}
      </h1>

      {isReconsent && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800">Returning to the Research Study</h2>
          <p className="text-sm text-green-700 mt-2">
            You previously participated in this research study. By re-consenting:
          </p>
          <ul className="list-disc ml-5 mt-2 text-sm text-green-700">
            <li>You'll receive a new research ID</li>
            <li>Only new interactions will be included in the research</li>
            <li>Your previous data remains anonymized</li>
            <li>All consent terms below apply to future data collection</li>
          </ul>
        </div>
      )}

      {/* Participant Information Section */}
      <div className="mb-8 prose max-w-none">
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Study Information</h2>
          
          <section className="mb-6">
            <h3 className="font-semibold mb-2">Study Title</h3>
            <p>Piloting artificial intelligence-based virtual patients in clinical medical students at Keele School of Medicine</p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Aims of the Research</h3>
            <p>This research aims to understand how medical students engage with AI-generated virtual patients and how this engagement influences learning outcomes and experiences. We want to explore how these novel educational tools might help develop clinical reasoning skills and prepare students for real-world patient encounters.</p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">What will happen if I take part?</h3>
            <p>If you agree to participate, you will:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Complete a short online demographic questionnaire (approximately 5 minutes)</li>
              <li>Continue using the AI-VP platform as part of the pilot program</li>
              <li>Participate in one online interview via Microsoft Teams (lasting 60-90 minutes)</li>
              <li>Have your platform usage data analysed, including consultation transcripts and cohort usage patterns</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Benefits of Participation</h3>
            <ul className="list-disc pl-5">
              <li>Contribute to the development of innovative medical education methods</li>
              <li>Gain insights into your own learning processes and clinical reasoning</li>
              <li>Help shape how AI-VPs might be used in medical education</li>
              <li>Opportunity to reflect on your learning experiences with AI-VPs</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Data Usage & Privacy</h3>
            <p>Your data will be:</p>
            <ul className="list-disc pl-5">
              <li>Stored securely in password-protected files</li>
              <li>Pseudonymized using unique identifiers</li>
              <li>Accessible only to the research team</li>
              <li>Retained securely for at least 10 years</li>
              <li>Used in publications only in anonymized form</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Consent Form Section */}
      <form onSubmit={handleMainConsent} className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Consent Statements</h2>
        
        <div className="space-y-3">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.readInfo}
              onChange={(e) => setConsents(prev => ({...prev, readInfo: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I confirm that I have read and understood the information sheet dated November 2024 (version 1.1) for the above study and have had the opportunity to ask questions</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.voluntary}
              onChange={(e) => setConsents(prev => ({...prev, voluntary: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I understand that my participation is voluntary and that I am free to withdraw at any time until my data is anonymized. In the event of withdrawal before anonymization, my interview data will be withdrawn.</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.platformData}
              onChange={(e) => setConsents(prev => ({...prev, platformData: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I understand that platform usage data will be collected and analysed as part of this research, including consultation transcripts, timing, and content</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.interview}
              onChange={(e) => setConsents(prev => ({...prev, interview: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I agree to participate in an online interview that will be audio recorded and transcribed</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.dataStorage}
              onChange={(e) => setConsents(prev => ({...prev, dataStorage: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I understand that my data will be stored securely and pseudonymized</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.futureResearch}
              onChange={(e) => setConsents(prev => ({...prev, futureResearch: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I agree for anonymized data to be used in future research projects subject to ethical approval</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.participation}
              onChange={(e) => setConsents(prev => ({...prev, participation: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I agree to take part in this study</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.futureContact}
              onChange={(e) => setConsents(prev => ({...prev, futureContact: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I agree to be contacted about possible participation in future research projects</span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={handleDecline}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {isReconsent ? 'Cancel' : 'Decline & Continue as Pilot Participant'}
          </button>
          
          <button
            type="submit"
            disabled={loading || !isAllConsentsChecked}
            className={`btn btn-primary flex items-center justify-center min-w-[200px] ${loading || !isAllConsentsChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              isReconsent ? 'Confirm & Rejoin Study' : 'I Agree to Participate in Research'
            )}
          </button>
        </div>

        {!isAllConsentsChecked && (
          <p className="text-sm text-red-500 text-center mt-2">
            Please review and check all consent statements to continue
          </p>
        )}
      </form>
    </div>
  );
}