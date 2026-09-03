import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const PRIVACY_MODE_KEY = 'finance-privacy-mode';
const MONEY_VALUE_PATTERN = /(?:[-+]?\s*\d[\d.,\s]*\s*(?:€|\$|£|¥|₹|₿|EUR\b|USD\b|GBP\b|CHF\b|JPY\b|CNY\b|CAD\b|AUD\b))|(?:(?:€|\$|£|¥|₹|₿)\s*[-+]?\s*\d)/i;
const MONEY_FIELD_PATTERN = /importe|amount|saldo|dinero|capital|precio|coste|comisi[oó]n|ingreso|gasto|beneficio|ahorro/i;

interface PrivacyContextType {
  privacyModeEnabled: boolean;
  contentVisible: boolean;
  contentHidden: boolean;
  setPrivacyModeEnabled: (enabled: boolean) => void;
  toggleContentVisibility: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const readPrivacyPreference = () => {
  try {
    return localStorage.getItem(PRIVACY_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [privacyModeEnabled, setPrivacyModeEnabledState] = useState(readPrivacyPreference);
  const [contentVisible, setContentVisible] = useState(() => !readPrivacyPreference());
  const previousUserId = useRef<string | null>(null);

  const setPrivacyModeEnabled = useCallback((enabled: boolean) => {
    setPrivacyModeEnabledState(enabled);
    setContentVisible(!enabled);
    try {
      localStorage.setItem(PRIVACY_MODE_KEY, String(enabled));
    } catch {
      // La preferencia sigue activa durante la sesión si el almacenamiento falla.
    }
  }, []);

  const toggleContentVisibility = useCallback(() => {
    setContentVisible((visible) => !visible);
  }, []);

  // Una sesión recién iniciada siempre empieza oculta cuando el modo está activo.
  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId && userId !== previousUserId.current && privacyModeEnabled) {
      setContentVisible(false);
    }
    previousUserId.current = userId;
  }, [privacyModeEnabled, user?.id]);

  // También vuelve a proteger los datos al abandonar o minimizar la PWA.
  useEffect(() => {
    const hideWhenBackgrounded = () => {
      if (document.visibilityState === 'hidden' && privacyModeEnabled) {
        setContentVisible(false);
      }
    };

    document.addEventListener('visibilitychange', hideWhenBackgrounded);
    return () => document.removeEventListener('visibilitychange', hideWhenBackgrounded);
  }, [privacyModeEnabled]);

  // El ajuste controla si se inicia oculto; el botón del menú puede ocultar
  // los importes temporalmente aunque esa preferencia esté desactivada.
  const contentHidden = !contentVisible;

  useEffect(() => {
    document.documentElement.classList.toggle('privacy-mode-hidden', contentHidden);
    return () => document.documentElement.classList.remove('privacy-mode-hidden');
  }, [contentHidden]);

  // Marca de forma automática los elementos que muestran importes. Al revisar
  // sólo el texto directo evitamos difuminar tarjetas o secciones completas.
  useEffect(() => {
    const updateElement = (element: Element) => {
      const directText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' ');

      const isMoneyText = MONEY_VALUE_PATTERN.test(directText);
      const isMoneyInput = element instanceof HTMLInputElement && (
        element.type === 'number' || MONEY_FIELD_PATTERN.test([
          element.name,
          element.id,
          element.placeholder,
          element.getAttribute('aria-label') ?? '',
        ].join(' '))
      );

      if (isMoneyText || isMoneyInput) {
        element.setAttribute('data-private-money-auto', 'true');
      } else {
        element.removeAttribute('data-private-money-auto');
      }
    };

    const scan = (node: Node) => {
      if (node instanceof Element) {
        updateElement(node);
        node.querySelectorAll('*').forEach(updateElement);
      } else if (node.parentElement) {
        updateElement(node.parentElement);
      }
    };

    scan(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          scan(mutation.target);
          return;
        }

        if (mutation.target instanceof Element) updateElement(mutation.target);
        mutation.addedNodes.forEach(scan);
      });
    });

    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <PrivacyContext.Provider
      value={{
        privacyModeEnabled,
        contentVisible,
        contentHidden,
        setPrivacyModeEnabled,
        toggleContentVisibility,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy debe usarse dentro de PrivacyProvider');
  }
  return context;
};
