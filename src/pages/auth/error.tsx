import { useRouter } from 'next/router';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  const { theme } = useTheme();

  const getErrorMessage = (error: string | string[] | undefined) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'AccessDenied':
        return 'You do not have permission to access this resource.';
      case 'Verification':
        return 'The verification link is invalid or has expired.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.bg.primary }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ 
            backgroundColor: `${theme.accent.error}15`,
            border: `2px solid ${theme.accent.error}`
          }}>
            <AlertCircle className="w-8 h-8" style={{ color: theme.accent.error }} />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: theme.text.primary }}>
            Authentication Error
          </h2>
          <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
            We encountered an issue while trying to authenticate you
          </p>
        </div>

        {/* Error Card */}
        <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: theme.bg.secondary }}>
          <div className="text-center space-y-6">
            {/* Error Message */}
            <div className="p-4 rounded-lg" style={{ 
              backgroundColor: `${theme.accent.error}15`,
              border: `1px solid ${theme.accent.error}`
            }}>
              <p style={{ color: theme.accent.error }} className="font-medium">
                {getErrorMessage(error)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full flex justify-center items-center py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.accent.primary,
                  color: theme.text.onAccent,
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </button>
              
              <button
                onClick={() => router.reload()}
                className="w-full flex justify-center items-center py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.bg.tertiary,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border}`
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>

            {/* Help Text */}
            <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
              <p className="text-xs" style={{ color: theme.text.secondary }}>
                If this issue persists, please contact support or try signing in again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 