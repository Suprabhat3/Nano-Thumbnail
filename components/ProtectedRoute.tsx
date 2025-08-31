// components/ProtectedRoute.tsx
"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireEmailVerification = true 
}) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (requireEmailVerification && !currentUser.emailVerified) {
        router.push('/verify-email');
      } else {
        setIsChecking(false);
      }
    }
  }, [currentUser, loading, router, requireEmailVerification]);

  // Show loading spinner while checking authentication
  if (loading || isChecking) {
    return (
      <div className="min-h-screen w-full relative bg-black font-sans flex items-center justify-center">
        {/* Same background as homepage */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.25), transparent 70%), #000000",
          }}
        />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and email is verified (or verification not required), render children
  if (currentUser && (!requireEmailVerification || currentUser.emailVerified)) {
    return <>{children}</>;
  }

  // This shouldn't render due to useEffect redirects, but just in case
  return null;
};

export default ProtectedRoute;