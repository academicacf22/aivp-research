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
            <p>Virtual Patients, Real Learning: Understanding How Medical Students Engage with AI-Generated Clinical Cases at Keele School of Medicine</p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Invitation</h3>
            <p>
              You are being invited to consider taking part in the research study examining how medical students
              engage with artificial intelligence-generated virtual patients (AI-VPs). This project is being
              undertaken by Dr Aditya Narain as part of his Masters research project, under the supervision of Dr
              Peter Yeates at Keele University School of Medicine.
            </p>
            <p className="mt-2">
              Before you decide whether you wish to take part, it is important for you to understand why this
              research is being done and what it will involve. Please take time to read this information carefully and
              discuss it with friends and relatives if you wish. Ask us if there is anything that is unclear or if you
              would like more information.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Aims of the Research</h3>
            <p>
              This research aims to understand how medical students engage with AI-generated virtual patients and
              how this engagement influences learning outcomes and experiences. We want to explore how these
              novel educational tools might help develop clinical reasoning skills and prepare students for real-
              world patient encounters.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Why have I been invited?</h3>
            <p>
              You have been invited because you are a clinical medical student (years 2-5) at Keele School of
              Medicine who is participating in the School's AI-VP pilot program, which allows you to have text-
              based conversations with an AI-generated virtual patient. We are seeking 15-20 participants with
              varying levels of clinical experience to help us understand how AI-VPs can support learning at
              different stages of medical education. The number of participants will be determined by the depth and
              variety of experiences we encounter during our interviews.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Do I have to take part?</h3>
            <p>
              You are free to decide whether you wish to take part or not. If you decide to take part, you will be
              asked to complete a consent form and a brief demographic questionnaire. As you know, participation
              in the AI-VP pilot program requires consent for anonymous platform data analysis. Involvement in
              this research study (including the interview) is entirely voluntary. You are free to withdraw from this
              study at any time without giving reasons up until the point where your data has been pseudonymised.
              If you withdraw before this point, any interview data collected will be deleted, though anonymous
              platform usage data will still be analysed as part of the pilot evaluation.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">What will happen if I take part?</h3>
            <p>If you agree to participate, you will:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Complete a short online demographic questionnaire (approximately 5 minutes)</li>
              <li>Continue using the AI-VP platform as part of the pilot program (however much/often you would like)</li>
              <li>Participate in one online interview via Microsoft Teams (lasting 45-60 minutes)</li>
              <li>Have your platform usage data analysed, including consultation transcripts and usage patterns</li>
            </ul>
            <p className="mt-2">All interviews will be audio-recorded and automatically transcribed through Microsoft Teams.</p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">What are the benefits of taking part?</h3>
            <p>By participating, you will:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Contribute to the development of innovative medical education methods</li>
              <li>Potentially gain insights into your own learning processes and clinical reasoning</li>
              <li>Help shape how AI-VPs might be used in medical education</li>
              <li>Have the opportunity to reflect on your learning experiences with AI-VPs</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">What are the risks of taking part?</h3>
            <p>The risks of participating are considered minimal, not exceeding those encountered in normal course activities. You might experience:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Time commitment (approximately 45-60 minutes for the interview)</li>
              <li>Potential minor stress from discussing learning experiences</li>
              <li>Possible frustration if talking about challenges with the AI-VP system</li>
              <li>It is important to consider the potential limitations of AI – you are encouraged to verify uncertain information from reputable sources</li>
            </ul>
            <p className="mt-2">We have established clear pathways for raising concerns and accessing student welfare services if needed.</p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">How will information about me be used?</h3>
            <p>Data collected will include:</p>
            <ol className="list-decimal pl-5 mt-2">
              <li>Platform usage data (consultation transcripts, timing, duration)</li>
              <li>Interview recordings and transcripts</li>
              <li>Demographic survey responses</li>
            </ol>
            <p className="mt-2">
              This data will be analysed using realist evaluation methodology to understand how AI-VPs support
              learning. The findings will be used in Dr Narain's thesis and may be published in academic journals or
              presented at conferences. All published data will be fully anonymised.
            </p>
            <p className="mt-2">
              Data may be retained for use in future research studies, subject to appropriate ethical approval.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Who will have access to information about me?</h3>
            <p>Your confidentiality will be safeguarded during and after the study:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Consultation transcript data will be stored as PDFs in password-protected Keele OneDrive cloud storage</li>
              <li>Interview recordings and transcripts will be stored in password-protected folders</li>
              <li>Access will be restricted to the research team</li>
              <li>Data will be pseudonymised using unique identifiers</li>
              <li>All data will be retained securely for at least 5 years</li>
              <li>Data will be disposed of or stored in a repository for future research in guidance with accepted practice according to Keele University</li>
              <li>In publications, you will not be identifiable</li>
            </ul>
            <p className="mt-2">
              I do however have to work within the confines of current legislation over such matters as privacy and
              confidentiality, data protection and human rights and so offers of confidentiality may sometimes be
              overridden by law. For example, in circumstances whereby I am concerned over any actual or
              potential harm to yourself or others I must pass this information to the relevant authorities.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Who is funding and organising the research?</h3>
            <p>
              This research is being conducted as part of Dr Narain's Masters studies at Keele University School of
              Medicine. It is not externally funded.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">What if there is a problem?</h3>
            <p>
              If you have concerns about any aspect of this study, please contact Dr Aditya Narain
              (a.narain@keele.ac.uk). Alternatively, you may contact Dr Peter Yeates (p.yeates@keele.ac.uk).
            </p>
            <p className="mt-2">
              If you remain unhappy about the research and/or wish to raise a complaint about any aspect of the
              way that you have been approached or treated during the course of the study please write to:
            </p>
            <div className="mt-2">
              <p>Head of Project Assurance</p>
              <p>Keele University</p>
              <p>ST5 5NH</p>
              <p>E-mail: research.governance@keele.ac.uk</p>
              <p>Tel: 01782 734714</p>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold mb-2">Contact for further information</h3>
            <p>
              For additional information about the study, please contact: Dr Aditya Narain Email:
              a.narain@keele.ac.uk
            </p>
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
            <span className="ml-2">I confirm that I have read and understood the information for the above study and have had the opportunity to ask questions</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.voluntary}
              onChange={(e) => setConsents(prev => ({...prev, voluntary: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I understand that my participation is voluntary and that I am free to withdraw at any time until my data is anonymised. In the event of withdrawal before anonymisation, my interview data will be withdrawn.</span>
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
            <span className="ml-2">I understand that my data will be stored securely and pseudonymised</span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={consents.futureResearch}
              onChange={(e) => setConsents(prev => ({...prev, futureResearch: e.target.checked}))}
              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2">I agree for anonymised data to be used in future research projects subject to ethical approval</span>
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