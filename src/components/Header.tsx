import { signOut, signIn, useSession } from 'next-auth/react';
import { LogOut, Sun, Moon, User } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';
import { useRouter } from 'next/router';

export const Header = () => {
  const { data: session } = useSession();
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const router = useRouter();

  return (
    <div 
      className="shadow-sm border-b" 
      style={{ 
        backgroundColor: theme.bg.secondary,
        borderColor: theme.border
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 style={{ color: theme.text.primary }} className="text-2xl font-bold">Task Dashboard</h1>
            <p style={{ color: theme.text.secondary }}>Welcome back, {session?.user?.name}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:opacity-80"
              style={{ backgroundColor: theme.bg.tertiary }}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" style={{ color: theme.text.primary }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: theme.text.primary }} />
              )}
            </button>
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ 
              backgroundColor: session?.user?.role === 'ADMIN' ? theme.accent.primary : theme.accent.secondary,
              color: theme.text.primary
            }}>
              {session?.user?.role}
            </span>
            {session ? (
              <>
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: theme.bg.tertiary }}
                >
                  <img
                    src={session.user?.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name ?? '')}&background=random`}
                    alt="Profile"
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>
                    {session.user?.name}
                  </span>
                  <User className="w-4 h-4" style={{ color: theme.text.secondary }} />
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="flex items-center px-3 py-2 hover:opacity-80"
                  style={{ color: theme.text.primary }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 