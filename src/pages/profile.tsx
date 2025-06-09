import { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import { useSession } from 'next-auth/react';
import { Upload, X, Mail, ArrowLeft } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/server/auth';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name ?? '');
  const [image, setImage] = useState(session?.user?.image ?? '');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? '');
      setImage(session.user.image ?? '');
    }
  }, [session?.user]);

  const sendOtp = api.auth.sendProfileUpdateOtp.useMutation({
    onSuccess: () => {
      setShowOtpInput(true);
      setIsSendingOtp(false);
      setOtpSent(true);
      setError('');
    },
    onError: (error) => {
      setError(error.message);
      setIsSendingOtp(false);
    },
  });

  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: async (data) => {
      console.log('Profile update successful, data:', data);
      
      // Update local state with the returned data
      if (data.user) {
        setName(data.user.name ?? '');
        setImage(data.user.image ?? '');
      }
      
      // Force session update
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.user?.name,
          image: data.user?.image,
        },
      });
      
      setShowOtpInput(false);
      setError('');
      setPreviewUrl(null);
      setOtpSent(false);
      setOtp('');
      setIsSuccess(true);
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'profile');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json() as { url: string };
        setImage(result.url);
      } catch (error) {
        console.error('Upload error:', error);
        setError('Failed to upload image');
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOtpInput) {
      setIsSendingOtp(true);
      sendOtp.mutate();
      return;
    }

    updateProfile.mutate({
      name,
      image,
      otp,
    });
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg.primary }}>
        <div className="max-w-md mx-auto p-8 rounded-lg text-center" style={{ backgroundColor: theme.bg.secondary }}>
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent.primary }}>
              <svg className="w-8 h-8" style={{ color: theme.text.onAccent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>Profile Updated!</h2>
          <p style={{ color: theme.text.secondary }}>Your profile has been successfully updated. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 hover:opacity-80"
            style={{ color: theme.text.primary }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="rounded-lg p-8 shadow-lg" style={{ backgroundColor: theme.bg.secondary }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: theme.text.primary }}>Update Profile</h1>
            <p style={{ color: theme.text.secondary }}>Keep your profile information up to date</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: theme.bg.tertiary,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border}`
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Profile Image
              </label>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={previewUrl ?? image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                    alt="Profile Preview"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setImage(session?.user?.image ?? '');
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                        }
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full"
                      style={{ backgroundColor: theme.accent.primary }}
                    >
                      <X className="w-4 h-4" style={{ color: theme.text.onAccent }} />
                    </button>
                  )}
                </div>
                <label className="flex items-center px-6 py-3 rounded-lg cursor-pointer hover:opacity-90" style={{ backgroundColor: theme.accent.primary }}>
                  <Upload className="w-5 h-5 mr-2" style={{ color: theme.text.onAccent }} />
                  <span style={{ color: theme.text.onAccent }}>Upload New Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {showOtpInput ? (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                  Enter OTP
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: theme.bg.tertiary,
                      color: theme.text.primary,
                      border: `1px solid ${theme.border}`
                    }}
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSendingOtp(true);
                        sendOtp.mutate();
                      }}
                      disabled={isSendingOtp}
                      className="px-4 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {otpSent && (
                  <p className="text-sm mt-2" style={{ color: theme.text.secondary }}>
                    OTP sent to your email. Check your inbox.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSendingOtp(true);
                  sendOtp.mutate();
                }}
                disabled={isSendingOtp}
                className="w-full px-4 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
              >
                {isSendingOtp ? 'Sending OTP...' : 'Send OTP to Update Profile'}
              </button>
            )}

            {error && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: theme.accent.error + '20', color: theme.accent.error }}>
                {error}
              </div>
            )}

            {showOtpInput && (
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-lg hover:opacity-90"
                  style={{ backgroundColor: theme.bg.tertiary, color: theme.text.primary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfile.isPending || !otp.trim()}
                  className="px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
                >
                  {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};