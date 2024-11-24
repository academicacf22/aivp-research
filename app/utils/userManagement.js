import { 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc, 
    serverTimestamp 
} from 'firebase/firestore';
import { db, UserType } from '../firebase';

export const userManagement = {
    // Fetch all users
    getAllUsers: async () => {
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    // Fetch users by role
    getUsersByRole: async (role) => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', role));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching users by role:', error);
            throw error;
        }
    },

    // Get research participants
    getResearchParticipants: async () => {
        return await userManagement.getUsersByRole(UserType.RESEARCH_PARTICIPANT);
    },

    // Get pilot participants
    getPilotParticipants: async () => {
        return await userManagement.getUsersByRole(UserType.PILOT_PARTICIPANT);
    },

    // Update user role
    updateUserRole: async (userId, newRole) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: newRole,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    },

    // Get user statistics
    getUserStats: async () => {
        try {
            const users = await userManagement.getAllUsers();
            return {
                total: users.length,
                researchParticipants: users.filter(u => u.role === UserType.RESEARCH_PARTICIPANT).length,
                pilotParticipants: users.filter(u => u.role === UserType.PILOT_PARTICIPANT).length,
                admins: users.filter(u => u.role === UserType.ADMIN).length,
                consentedUsers: users.filter(u => u.hasConsented).length
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    },

    // Get user details
    getUserDetails: async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }
            return {
                id: userDoc.id,
                ...userDoc.data()
            };
        } catch (error) {
            console.error('Error getting user details:', error);
            throw error;
        }
    }
};