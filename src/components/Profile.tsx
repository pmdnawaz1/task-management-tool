import { useState } from 'react';
import { api } from '~/utils/api';
import { useSession } from 'next-auth/react';
import { Upload, X, Mail } from 'lucide-react';

export const Profile = () => {
  const { data: session, update: updateSession } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(session?.user?.name ?? '');
  const [image, setImage] = useState(session?.user?.image ?? '');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

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
    onSuccess: async () => {
      await updateSession();
      setIsOpen(false);
      setShowOtpInput(false);
      setError('');
      setPreviewUrl(null);
      setOtpSent(false);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setImage(url);
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

  const handleClose = () => {
    setIsOpen(false);
    setShowOtpInput(false);
    setError('');
    setPreviewUrl(null);
    setOtpSent(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={session?.user?.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name ?? '')}&background=random`}
          alt="Profile"
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{session?.user?.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-lg shadow-lg p-6 z-50" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Update Profile</h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--bg-quaternary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Profile Image
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl ?? session?.user?.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name ?? '')}&background=random`}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setImage('');
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                        }
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    </button>
                  )}
                </div>
                <label className="flex items-center px-4 py-2 rounded-md cursor-pointer hover:opacity-90" style={{ backgroundColor: 'var(--accent-primary)' }}>
                  <Upload className="w-4 h-4 mr-2" style={{ color: 'var(--text-primary)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Upload Image</span>
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
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Enter OTP
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--bg-quaternary)'
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
                      className="px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {otpSent && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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
                className="w-full px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
              >
                {isSendingOtp ? 'Sending OTP...' : 'Send OTP to Update'}
              </button>
            )}

            {error && (
              <div className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                {error}
              </div>
            )}

            {showOtpInput && (
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-md hover:opacity-90"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
                >
                  {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}; 