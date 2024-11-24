'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

export default function SignupForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();
  
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
  
      setLoading(true);
  
      try {
        // All users start as pilot participants
        await signup(email, password);
        toast.success('Account created successfully!');
        // Redirect to consent form instead of dashboard
        router.push('/consent');
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-primary text-center mb-6">Create Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Enter your email"
          />
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
    </div>
  );
}