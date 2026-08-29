import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColorTheme = 'indigo' | 'sapphire' | 'teal' | 'amber' | 'ocean' | 'violet' | 'obsidian';
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
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme');
    if (saved === 'emerald' || saved === 'rose') return 'indigo';
    return (saved as ColorTheme) || 'indigo';
  });

  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('layoutMode');
    return (saved as LayoutMode) || 'bento';
  });

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
    const themes: ColorTheme[] = ['indigo', 'sapphire', 'teal', 'amber', 'ocean', 'violet', 'obsidian'];
    
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
