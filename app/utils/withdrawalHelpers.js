import { db } from '@/app/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  deleteField 
} from 'firebase/firestore';
import { logConsentChange } from './auditLog';

export const withdrawConsent = async (userId, reason = '') => {
  try {
    // Get user's research data before withdrawal
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const oldAnonymousId = userDoc.data().anonymousId;

    // Store withdrawal record
    await addDoc(collection(db, 'consent_history'), {
      userId,
      anonymousId: oldAnonymousId,
      type: 'withdrawal',
      timestamp: serverTimestamp(),
      reason
    });

    // Update user role
    await updateDoc(userRef, {
      role: 'pilot_participant',
      hasConsented: false,
      anonymousId: null,
      consentWithdrawnAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });

    // Anonymize research data
    const participantsRef = collection(db, 'research_participants');
    const q = query(participantsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const participantDoc = snapshot.docs[0];
      await updateDoc(doc(participantsRef, participantDoc.id), {
        userId: 'withdrawn',
        withdrawalDate: serverTimestamp(),
        withdrawalReason: reason || null,
        dataRetained: true,
        lastUpdated: serverTimestamp()
      });

      // Update transcripts
      const transcriptsRef = collection(db, 'transcripts');
      const transcriptsQuery = query(transcriptsRef, 
        where('userId', '==', userId),
        where('isResearchSession', '==', true)
      );
      const transcriptsSnapshot = await getDocs(transcriptsQuery);

      await Promise.all(transcriptsSnapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          userId: 'withdrawn',
          withdrawnAt: serverTimestamp()
        })
      ));
    }

    await logConsentChange(userId, 'withdrawal', {
      timestamp: serverTimestamp(),
      reason: reason || 'No reason provided',
      success: true,
      previousAnonymousId: oldAnonymousId
    });

  } catch (error) {
    console.error('Error withdrawing consent:', error);
    await logConsentChange(userId, 'withdrawal_failed', {
      timestamp: serverTimestamp(),
      error: error.message,
      success: false
    });
    throw error;
  }
};

export const canReconsent = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.consentWithdrawnAt !== undefined;
  } catch (error) {
    console.error('Error checking reconsent eligibility:', error);
    return false;
  }
};