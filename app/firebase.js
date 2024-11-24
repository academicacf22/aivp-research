import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';
import { config } from './utils/config';

// Initialize Firebase using environment variables
const app = initializeApp(config.firebase);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collections
export const usersCollection = collection(db, 'users');
export const transcriptsCollection = collection(db, 'transcripts');
export const participantsCollection = collection(db, 'participants');
export const settingsCollection = collection(db, 'settings');

// Documents
export const settingsDoc = doc(db, 'settings', 'websiteSettings');

// User Types
export const UserType = {
    PILOT_PARTICIPANT: 'pilot_participant',
    RESEARCH_PARTICIPANT: 'research_participant',
    ADMIN: 'admin'
};