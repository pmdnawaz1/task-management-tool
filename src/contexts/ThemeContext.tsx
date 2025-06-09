import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: {
    bg: {
      primary: string;
      secondary: string;
      tertiary: string;
      quaternary: string;
    };
    text: {
      primary: string;
      secondary: string;
      onAccent?: string;
    };
    accent: {
      primary: string;
      secondary: string;
      error?: string;
      success?: string;
      warning?: string;
    };
    priority: {
      high: string;
      medium: string;
      low: string;
    };
    status: {
      open: string;
      inProgress: string;
      review: string;
      done: string;
    };
    border: string;
    modalBackdrop: string;
  };
}

const lightTheme = {
  bg: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    quaternary: '#e2e8f0',
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#6366f1', // Vibrant indigo
    secondary: '#8b5cf6', // Vibrant purple
    error: '#ef4444',
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
  },
  priority: {
    high: '#ef4444', // Red
    medium: '#f59e0b', // Amber
    low: '#10b981', // Green
  },
  status: {
    open: '#6b7280', // Gray
    inProgress: '#3b82f6', // Blue
    review: '#8b5cf6', // Purple
    done: '#10b981', // Green
  },
  border: '#e2e8f0',
  modalBackdrop: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme = {
  bg: {
    primary: '#1B1B1B',
    secondary: '#2A2A2A',
    tertiary: '#3A3A3A',
    quaternary: '#4A4A4A',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#818cf8', // Lighter indigo for dark mode
    secondary: '#a78bfa', // Lighter purple for dark mode
    error: '#f87171',
    success: '#34d399', // Lighter emerald
    warning: '#fbbf24', // Lighter amber
  },
  priority: {
    high: '#f87171', // Lighter red
    medium: '#fbbf24', // Lighter amber
    low: '#34d399', // Lighter green
  },
  status: {
    open: '#9ca3af', // Lighter gray
    inProgress: '#60a5fa', // Lighter blue
    review: '#a78bfa', // Lighter purple
    done: '#34d399', // Lighter green
  },
  border: '#4A4A4A',
  modalBackdrop: 'rgba(0, 0, 0, 0.8)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'true' : prefersDark;
    
    setIsDarkMode(shouldUseDark);
    
    // Apply theme to document
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    isDarkMode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div 
        style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
        className="min-h-screen transition-colors duration-300"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};