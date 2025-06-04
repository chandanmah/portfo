"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      const result = await response.json();
      setIsSetupMode(!result.isSetup);
    } catch (error) {
      setIsSetupMode(true); // Assume setup needed if check fails
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation for setup mode
    if (isSetupMode) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, isSetup: isSetupMode }),
      });

      const result = await response.json();

      if (response.ok) {
        if (isSetupMode) {
          setIsSetupMode(false);
          setPassword('');
          setConfirmPassword('');
          setError('');
          alert('Admin password set successfully! Please login with your new password.');
        } else {
          // Set authentication cookie
          document.cookie = 'admin-auth=true; path=/; max-age=86400; secure; samesite=strict';
          router.push('/admin_CM');
        }
      } else {
        setError(result.message || (isSetupMode ? 'Setup failed' : 'Invalid password'));
      }
    } catch (error) {
      setError(isSetupMode ? 'Setup failed. Please try again.' : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isSetupMode ? 'Admin Setup' : 'Admin Access'}
          </h1>
          <p className="text-gray-600">
            {isSetupMode 
              ? 'Set up your admin password for the first time'
              : 'Enter your password to access the admin panel'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {isSetupMode ? 'Create Admin Password' : 'Admin Password'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder={isSetupMode ? 'Create a strong password (min 8 characters)' : 'Enter your admin password'}
              required
              disabled={isLoading}
              minLength={isSetupMode ? 8 : undefined}
            />
          </div>

          {isSetupMode && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading 
              ? (isSetupMode ? 'Setting up...' : 'Logging in...') 
              : (isSetupMode ? 'Set Password' : 'Login')
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}