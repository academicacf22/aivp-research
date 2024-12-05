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
            await sendPasswordResetEmail(auth, email);
            toast.success('Password reset email sent');
        } catch (error) {
            toast.error('Error sending password reset email');
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

                    // Allow access if user is verified OR is an admin
                    if (firebaseUser.emailVerified || userData?.role === UserType.ADMIN) {
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

    // Signup function with email verification
    const signup = async (email, password) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            
            // Send verification email
            await sendEmailVerification(firebaseUser);
            
            // Create initial user document
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                role: UserType.PILOT_PARTICIPANT,
                hasConsented: false,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                metadata: {
                    signupDate: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                }
            });

            // Sign out immediately after signup so user must verify email
            await signOut(auth);
            return userCredential;
        } catch (error) {
            setError(error.message);
            throw error;
        }
    };

    // Login function with verification check
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Check if user is admin first
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const userData = userDoc.data();

            // If not admin, verify email
            if (userData?.role !== UserType.ADMIN && !firebaseUser.emailVerified) {
                await signOut(auth);
                throw { code: 'auth/unverified-email' };
            }

            // Update last login timestamp
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
                lastActive: serverTimestamp(),
                'metadata.lastLogin': new Date().toISOString()
            });

            return userCredential;
        } catch (error) {
            setError(error.message);
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