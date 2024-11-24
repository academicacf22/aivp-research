import { db } from '@/app/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logConsentChange = async (userId, action, details) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      type: 'consent_change'
    });
  } catch (error) {
    console.error('Error logging consent change:', error);
    throw error;
  }
};