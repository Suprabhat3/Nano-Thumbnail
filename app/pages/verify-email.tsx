// pages/verify-email.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendEmailVerification, reload } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // If email is already verified, redirect to dashboard
    if (currentUser.emailVerified) {
      router.push('/dashboard');
      return;
    }
  }, [currentUser, router]);

  const handleResendVerification = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError('');
    try {
      await sendEmailVerification(currentUser);
      setEmailSent(true);
    } catch (error: any) {
      console.error('Send verification error:', error);
      setError(error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;

    setCheckingVerification(true);
    try {
      // Reload user data to get updated verification status
      await reload(currentUser);
      
      if (currentUser.emailVerified) {
        router.push('/dashboard');
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      console.error('Check verification error:', error);
      setError('Failed to check verification status');
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen w-full relative bg-black font-sans flex items-center justify-center">
      {/* Same background as homepage */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.25), transparent 70%), #000000",
        }}
      />
      
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold text-white mb-4">Verify Your Email</h1>
          
          <div className="text-gray-300 mb-6">
            <p className="mb-2">We've sent a verification link to:</p>
            <p className="font-semibold text-white break-all">{currentUser?.email}</p>
          </div>

          <p className="text-gray-400 text-sm mb-8">
            Click the link in your email to verify your account. 
            Don't forget to check your spam folder!
          </p>

          {/* Success Message */}
          {emailSent && (
            <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
              <p className="text-green-400 text-sm">Verification email sent successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleCheckVerification}
              disabled={checkingVerification}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {checkingVerification ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'I\'ve Verified My Email'
              )}
            </button>

            <button
              onClick={handleResendVerification}
              disabled={loading || emailSent}
              className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : emailSent ? (
                'Email Sent ✓'
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-3">
              Wrong email address?
            </p>
            <button
              onClick={handleLogout}
              className="text-pink-400 hover:text-pink-300 font-medium text-sm"
            >
              Sign out and use different email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;