'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SignupForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();
  
    const validateEmail = (email) => {
      // Check if email ends with .ac.uk
      if (!email.toLowerCase().endsWith('.ac.uk')) {
        toast.error('Please use your university email address (ending in .ac.uk)');
        return false;
      }
      return true;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
  
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      if (!validateEmail(email)) {
        return;
      }
  
      setLoading(true);
  
      try {
        // Create account and send verification email
        const userCredential = await signup(email, password);
        setVerificationSent(true);
        toast.success('Account created! Please check your email to verify your account.');
      } catch (error) {
        // Handle specific Firebase error codes
        if (error.code === 'auth/email-already-in-use') {
          toast.error('An account with this email already exists');
        } else {
          toast.error(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow p-8">
      {verificationSent ? (
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{email}</strong>.
            Please check your email and click the link to verify your account.
          </p>
          <p className="text-sm text-gray-500">
            Once verified, you can <Link href="/login" className="text-primary hover:text-secondary font-medium">login here</Link>
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-primary text-center mb-6">Create Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                University Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your.email@university.ac.uk"
              />
              <p className="mt-1 text-sm text-gray-500">
                Please use your university email ending in .ac.uk
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-secondary font-medium">
              Login here
            </Link>
          </p>
        </>
      )}
    </div>
  );
}