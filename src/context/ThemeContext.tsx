import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('freelance_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('freelance_theme', theme);
    } catch {}

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--bg-base', '#121212');
      root.style.setProperty('--bg-panel', '#1c1c1c');
      root.style.setProperty('--bg-panel-subtle', '#262626');
      root.style.setProperty('--line', '#383838');
      root.style.setProperty('--ink', '#F3F2EE');
      root.style.setProperty('--ink-muted', 'rgba(243, 242, 238, 0.6)');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--bg-base', '#E4E3E0');
      root.style.setProperty('--bg-panel', '#DCDAD7');
      root.style.setProperty('--bg-panel-subtle', '#D4D2CE');
      root.style.setProperty('--line', '#141414');
      root.style.setProperty('--ink', '#141414');
      root.style.setProperty('--ink-muted', 'rgba(20, 20, 20, 0.6)');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
