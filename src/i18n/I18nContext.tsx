import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { translations, type Locale, type Translations } from './translations';

const STORAGE_KEY = 'chargeflow-locale';

function getStoredLocale(): Locale {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'de' || stored === 'en') return stored;
    } catch {
        // localStorage might be unavailable
    }
    // Default to browser language
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang === 'de') return 'de';
    return 'en';
}

interface I18nContextType {
    locale: Locale;
    t: Translations;
    setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        try {
            localStorage.setItem(STORAGE_KEY, l);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const t = translations[locale];

    return (
        <I18nContext.Provider value={{ locale, t, setLocale }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
