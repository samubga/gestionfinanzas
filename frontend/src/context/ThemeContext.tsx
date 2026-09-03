import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type ColorTheme = 'indigo' | 'sapphire' | 'teal' | 'amber' | 'ocean' | 'violet' | 'rose' | 'obsidian';
export type LayoutMode = 'classic' | 'bento';

interface ThemeContextType {
  dark: boolean;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayoutMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateDisplayPreferences } = useAuth();
  const [preferencesUserId, setPreferencesUserId] = useState<string | null>(null);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme');
    if (saved === 'emerald') return 'indigo';
    return (saved as ColorTheme) || 'indigo';
  });

  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('layoutMode');
    return (saved as LayoutMode) || 'bento';
  });

  // Apply the saved preferences as soon as the authenticated user is known.
  useEffect(() => {
    if (!user) {
      setPreferencesUserId(null);
      return;
    }
    setDark(user.themeDark);
    setColorThemeState(user.colorTheme);
    setLayoutModeState(user.layoutMode);
    setPreferencesUserId(user.id);
  }, [user?.id]);

  // Persist a user's choices in their profile (and retain a local fallback before login).
  useEffect(() => {
    if (!user || preferencesUserId !== user.id) return;
    if (dark === user.themeDark && colorTheme === user.colorTheme && layoutMode === user.layoutMode) return;

    void updateDisplayPreferences({ themeDark: dark, colorTheme, layoutMode }).catch((error) => {
      console.error('No se pudieron guardar las preferencias de visualización:', error);
    });
  }, [dark, colorTheme, layoutMode, user, preferencesUserId, updateDisplayPreferences]);

  // Handle dark mode class
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Handle color theme class
  useEffect(() => {
    const themes: ColorTheme[] = ['indigo', 'sapphire', 'teal', 'amber', 'ocean', 'violet', 'rose', 'obsidian'];
    
    // Remove all theme classes first
    themes.forEach((t) => {
      document.documentElement.classList.remove(`theme-${t}`);
    });
    
    // Add current theme class
    document.documentElement.classList.add(`theme-${colorTheme}`);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  // Handle layout mode storage
  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
  }, [layoutMode]);

  const toggleTheme = () => setDark((prev) => !prev);
  
  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
  };

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode);
  };

  const toggleLayoutMode = () => {
    setLayoutModeState((prev) => (prev === 'classic' ? 'bento' : 'classic'));
  };

  return (
    <ThemeContext.Provider value={{
      dark,
      toggleTheme,
      colorTheme,
      setColorTheme,
      layoutMode,
      setLayoutMode,
      toggleLayoutMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
