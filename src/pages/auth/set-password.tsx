import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { useTheme } from '~/contexts/ThemeContext';
import { Eye, EyeOff, Lock, Key, Check } from 'lucide-react';

export default function SetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { theme } = useTheme();

  const setPasswordMutation = api.auth.setPassword.useMutation({
    onSuccess: () => {
      void router.push('/auth/signin');
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (typeof token !== 'string') {
      setError('Invalid token');
      return;
    }

    setPasswordMutation.mutate({
      token,
      password,
    });
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.bg.primary }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: theme.accent.primary }}>
            <Key className="w-8 h-8" style={{ color: theme.text.onAccent }} />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: theme.text.primary }}>
            Set Your Password
          </h2>
          <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
            Create a secure password for your account
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: theme.bg.secondary }}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg p-4" style={{ 
                backgroundColor: `${theme.accent.error}15`,
                border: `1px solid ${theme.accent.error}`,
                color: theme.accent.error
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="block w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    '--tw-ring-color': theme.accent.primary,
                  } as React.CSSProperties}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:opacity-80"
                    style={{ color: theme.text.secondary }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="h-1 rounded-full flex-1"
                        style={{
                          backgroundColor: passwordStrength >= level 
                            ? passwordStrength <= 2 ? theme.accent.error 
                              : passwordStrength <= 3 ? '#FFA500' 
                              : theme.accent.success
                            : theme.bg.quaternary
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ 
                    color: passwordStrength <= 2 ? theme.accent.error 
                      : passwordStrength <= 3 ? '#FFA500' 
                      : theme.accent.success
                  }}>
                    Password strength: {
                      passwordStrength <= 2 ? 'Weak' 
                        : passwordStrength <= 3 ? 'Medium' 
                        : 'Strong'
                    }
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="block w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${confirmPassword && passwordsMatch ? theme.accent.success : theme.border}`,
                    '--tw-ring-color': theme.accent.primary,
                  } as React.CSSProperties}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                  {confirmPassword && passwordsMatch && (
                    <Check className="h-4 w-4" style={{ color: theme.accent.success }} />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:opacity-80"
                    style={{ color: theme.text.secondary }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={setPasswordMutation.isPending || !passwordsMatch || passwordStrength < 3}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: theme.accent.primary,
                color: theme.text.onAccent,
              }}
            >
              {setPasswordMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: theme.text.onAccent }}></div>
                  Setting Password...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Set Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 