'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    auth,
    db,
    UserType
} from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification
} from 'firebase/auth';
import {
    collection,
    query,
    where,
    getDocs,
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Reset password functionality
    const resetPassword = async (email) => {
        try {
            // First check if the email exists in our users collection
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                throw new Error('No account found with this email');
            }

            await sendPasswordResetEmail(auth, email);
            toast.success('Password reset email sent');
        } catch (error) {
            console.error('Password reset error:', error);
            toast.error(error.message || 'Error sending password reset email');
            throw error;
        }
    };

    // Check if user is admin
    const isAdmin = () => {
        return user?.role === UserType.ADMIN;
    };

    // Check if user is research participant
    const isResearchParticipant = () => {
        return user?.role === UserType.RESEARCH_PARTICIPANT;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    const userData = userDoc.data();

                    // Check if this is an existing user by looking at creation time
                    const isExistingUser = userData?.createdAt && 
                        (new Date(userData.createdAt.seconds * 1000) < new Date('2023-12-06'));

                    // Allow access if:
                    // 1. User is an admin OR
                    // 2. User is verified OR
                    // 3. User existed before verification requirement
                    if (userData?.role === UserType.ADMIN || 
                        firebaseUser.emailVerified || 
                        isExistingUser) {
                        
                        setUser({
                            ...firebaseUser,
                            role: userData?.role || UserType.PILOT_PARTICIPANT,
                            hasConsented: userData?.hasConsented || false,
                            consentDetails: userData?.consents || null,
                            lastActive: userData?.lastActive || null,
                            metadata: userData?.metadata || {},
                            anonymousId: userData?.anonymousId || null
                        });

                        await updateDoc(doc(db, 'users', firebaseUser.uid), {
                            lastActive: serverTimestamp()
                        });
                    } else {
                        setUser(null);
                        throw { code: 'auth/unverified-email' };
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError(error.message);
                    if (error.code === 'auth/unverified-email') {
                        await signOut(auth);
                    }
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Signup function - simplified to only handle auth user creation and verification
    const signup = async (email, password) => {
        try {
            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            
            // 2. Send verification email
            await sendEmailVerification(firebaseUser);
            
            // 3. Sign out and wait for verification
            await signOut(auth);
            return userCredential;
        } catch (error) {
            console.error('Signup error:', error);
            await signOut(auth).catch(() => {});
            throw error;
        }
    };

    // Modified login function to handle first-time document creation
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Check if user document exists
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            // If no document exists and email is verified, create it
            if (!userDoc.exists() && firebaseUser.emailVerified) {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                    email: firebaseUser.email,
                    role: UserType.PILOT_PARTICIPANT,
                    hasConsented: false,
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    emailVerified: firebaseUser.emailVerified,
                    metadata: {
                        signupDate: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    }
                });
                return userCredential;
            }

            // For existing users, check verification status
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const isExistingUser = userData?.createdAt && 
                    (new Date(userData.createdAt.seconds * 1000) < new Date('2023-12-06'));

                if (userData?.role === UserType.ADMIN || 
                    firebaseUser.emailVerified || 
                    isExistingUser) {
                    
                    await updateDoc(doc(db, 'users', firebaseUser.uid), {
                        lastActive: serverTimestamp(),
                        'metadata.lastLogin': new Date().toISOString(),
                        emailVerified: firebaseUser.emailVerified
                    });

                    return userCredential;
                }
            }

            // If email isn't verified, sign out and throw error
            await signOut(auth);
            throw { code: 'auth/unverified-email' };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            if (user) {
                await updateDoc(doc(db, 'users', user.uid), {
                    lastActive: serverTimestamp()
                });
            }
            await signOut(auth);
        } catch (error) {
            setError(error.message);
            throw error;
        }
    };

    // Update user role
    const updateUserRole = async (newRole) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                role: newRole,
                lastUpdated: serverTimestamp()
            });

            setUser(prev => ({
                ...prev,
                role: newRole
            }));
        } catch (error) {
            setError(error.message);
            throw error;
        }
    };

    // Update consent status
    const updateConsent = async (consentDetails) => {
        if (!user) return;
      
        try {
          // Generate new anonymous ID
          const anonymousId = `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
          await updateDoc(doc(db, 'users', user.uid), {
            role: UserType.RESEARCH_PARTICIPANT,
            hasConsented: true,
            anonymousId: anonymousId,
            consents: consentDetails,
            consentTimestamp: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
      
          setUser(prev => ({
            ...prev,
            role: UserType.RESEARCH_PARTICIPANT,
            hasConsented: true,
            consentDetails,
            anonymousId: anonymousId
          }));
        } catch (error) {
          setError(error.message);
          throw error;
        }
    };

    const updateProfileCompletion = async (status) => {
        if (!user) return;
      
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            profileComplete: status,
            lastUpdated: serverTimestamp()
          });
      
          setUser(prev => ({
            ...prev,
            profileComplete: status
          }));
        } catch (error) {
          setError(error.message);
          throw error;
        }
    };

    const value = {
        user,
        loading,
        error,
        signup,
        login,
        logout,
        resetPassword,
        updateUserRole,
        updateConsent,
        updateProfileCompletion,
        isAdmin,
        isResearchParticipant
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}