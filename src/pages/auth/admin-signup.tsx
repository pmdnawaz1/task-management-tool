import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Shield, User, Key } from 'lucide-react';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/server/auth';
import { useTheme } from '~/contexts/ThemeContext';
import { api } from '~/utils/api';

const adminSignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  adminKey: z.string().min(1, 'Admin key is required'),
});

type AdminSignupFormData = z.infer<typeof adminSignupSchema>;

export default function AdminSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const signUpAdminMutation = api.auth.signUpAdmin.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminSignupFormData>({
    resolver: zodResolver(adminSignupSchema),
  });

  const onSubmit = async (data: AdminSignupFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await signUpAdminMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        adminKey: data.adminKey,
      });

      setSuccess('Admin account created successfully! You can now sign in.');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.bg.primary }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: theme.accent.error }}>
            <Shield className="w-8 h-8" style={{ color: theme.text.onAccent }} />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: theme.text.primary }}>
            Create Admin Account
          </h2>
          <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
            Register a new administrator account
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: theme.bg.secondary }}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-lg p-4" style={{ 
                backgroundColor: `${theme.accent.error}15`,
                border: `1px solid ${theme.accent.error}`,
                color: theme.accent.error
              }}>
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg p-4" style={{ 
                backgroundColor: `${theme.accent.success}15`,
                border: `1px solid ${theme.accent.success}`,
                color: theme.accent.success
              }}>
                {success}
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  {...register('name')}
                  type="text"
                  autoComplete="name"
                  className="block w-full pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    '--tw-ring-color': theme.accent.error,
                  } as React.CSSProperties}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm" style={{ color: theme.accent.error }}>{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    '--tw-ring-color': theme.accent.error,
                  } as React.CSSProperties}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm" style={{ color: theme.accent.error }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    '--tw-ring-color': theme.accent.error,
                  } as React.CSSProperties}
                  placeholder="Enter your password"
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
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: theme.accent.error }}>{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                Admin Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5" style={{ color: theme.text.secondary }} />
                </div>
                <input
                  {...register('adminKey')}
                  type="password"
                  className="block w-full pl-10 pr-3 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    '--tw-ring-color': theme.accent.error,
                  } as React.CSSProperties}
                  placeholder="Enter admin key"
                />
              </div>
              {errors.adminKey && (
                <p className="mt-1 text-sm" style={{ color: theme.accent.error }}>{errors.adminKey.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: theme.accent.error,
                color: theme.text.onAccent,
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: theme.text.onAccent }}></div>
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Admin Account
                </>
              )}
            </button>
          </form>

          {/* Admin Key Information */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: theme.border }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3" style={{ backgroundColor: theme.bg.secondary, color: theme.text.secondary }}>
                  Important
                </span>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: theme.bg.tertiary }}>
              <div className="text-center text-sm space-y-2" style={{ color: theme.text.secondary }}>
                <p>
                  <span className="font-medium" style={{ color: theme.text.primary }}>Admin Key Required:</span> Contact your system administrator for the admin key.
                </p>
                <p>
                  This key is required to create new admin accounts and is set via the ADMIN_SIGNUP_KEY environment variable.
                </p>
              </div>
            </div>
          </div>

          {/* Back to regular signin */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/auth/signin')}
              className="text-sm hover:opacity-80"
              style={{ color: theme.accent.primary }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    // If user is already signed in, check if they're admin
    if (session.user.role === 'ADMIN') {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      };
    } else {
      // If they're not admin, redirect to regular signin
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }
  }

  return {
    props: {},
  };
};