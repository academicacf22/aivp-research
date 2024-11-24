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
    sendPasswordResetEmail
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              const userData = userDoc.data();
              
              setUser({
                ...user,
                role: userData?.role || UserType.PILOT_PARTICIPANT,
                hasConsented: userData?.hasConsented || false,
                consentDetails: userData?.consents || null,
                lastActive: userData?.lastActive || null,
                metadata: userData?.metadata || {},
                anonymousId: userData?.anonymousId || null  // Explicitly include anonymousId
              });
      
              // Update last active timestamp
              await updateDoc(doc(db, 'users', user.uid), {
                lastActive: serverTimestamp()
              });
            } catch (error) {
              console.error('Error fetching user data:', error);
              setError(error.message);
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      
        return () => unsubscribe();
      }, []);

    // Signup function
    const signup = async (email, password) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create initial user document
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: UserType.PILOT_PARTICIPANT,
                hasConsented: false,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                metadata: {
                    signupDate: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                }
            });

            return user;
        } catch (error) {
            setError(error.message);
            throw error;
        }
    };

    // Login function
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update last login
            await updateDoc(doc(db, 'users', user.uid), {
                lastActive: serverTimestamp(),
                'metadata.lastLogin': new Date().toISOString()
            });

            return user;
        } catch (error) {
            setError(error.message);
            throw error;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            if (user) {
                // Update last active timestamp before logout
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
            anonymousId: anonymousId,  // Make sure this is being set
            consents: consentDetails,
            consentTimestamp: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
      
          setUser(prev => ({
            ...prev,
            role: UserType.RESEARCH_PARTICIPANT,
            hasConsented: true,
            consentDetails,
            anonymousId: anonymousId  // Update the user state with new anonymousId
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
        updateProfileCompletion, // Add this line
        isAdmin,
        isResearchParticipant
      };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}