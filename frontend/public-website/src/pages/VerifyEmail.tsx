import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const email = location.state?.email || '';

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setStatus('verifying');
    setMessage('Verifying your email...');

    try {
      await api.verifyEmail(email, code);
      setStatus('success');
      setMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to verify email');
    }
  }, [navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    const emailParam = searchParams.get('email');

    if (code && emailParam) {
      verifyEmail(emailParam, code);
    }
  }, [searchParams, verifyEmail]);

  const resendVerification = async () => {
    if (!email) {
      setMessage('Email address not found. Please register again.');
      return;
    }

    try {
      setMessage('Sending verification email...');
      await api.resendVerification(email);
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to resend verification email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {status === 'pending' && (
            <div className="text-center space-y-4">
              <div className="text-blue-600">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-gray-700">
                  We've sent a verification email to:
                </p>
                <p className="font-medium text-gray-900 mt-2">{email}</p>
              </div>
              <p className="text-sm text-gray-600">
                Please check your inbox and click the verification link to activate your account.
              </p>
              <div className="pt-4">
                <button
                  onClick={resendVerification}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Didn't receive the email? Resend
                </button>
              </div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="text-gray-700">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-700">{message}</p>
              <p className="text-sm text-gray-600">Redirecting to login...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-red-600">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-700">{message}</p>
              <div className="pt-4 space-y-2">
                {email && (
                  <button
                    onClick={resendVerification}
                    className="block w-full text-sm text-blue-600 hover:text-blue-500"
                  >
                    Resend verification email
                  </button>
                )}
                <a
                  href="/register"
                  className="block w-full text-sm text-gray-600 hover:text-gray-500"
                >
                  Back to registration
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
