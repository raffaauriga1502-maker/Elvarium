import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';

// REMOVED: import enTranslations from ...
// This removes the static import that was causing the module resolution error.
// Translations are now loaded dynamically via fetch.

export const supportedLanguages = {
    en: { flag: '🇬🇧' },
    es: { flag: '🇪🇸' },
    fr: { flag: '🇫🇷' },
    de: { flag: '🇩🇪' },
    id: { flag: '🇮🇩' },
};

export type LanguageCode = keyof typeof supportedLanguages;

interface I18nContextType {
    lang: LanguageCode;
    setLang: (lang: LanguageCode) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<LanguageCode>(() => {
        try {
            const savedLang = localStorage.getItem('elvarium_language');
            return (savedLang && supportedLanguages[savedLang as LanguageCode]) ? (savedLang as LanguageCode) : 'en';
        } catch (e) {
            return 'en';
        }
    });

    const [translations, setTranslations] = useState<Record<string, any> | null>(null);
    const [fallbackTranslations, setFallbackTranslations] = useState<Record<string, any> | null>(null);

    useEffect(() => {
        const loadTranslations = async () => {
            // Step 1: Ensure English is loaded as the fallback.
            // This only runs once when the component mounts.
            let fallbackData = fallbackTranslations;
            if (!fallbackData) {
                try {
                    const res = await fetch('/locales/en.json');
                    fallbackData = await res.json();
                    setFallbackTranslations(fallbackData);
                } catch (e) {
                    console.error("Failed to load fallback translations (en.json)", e);
                    fallbackData = {}; // Set empty to prevent retries
                    setFallbackTranslations(fallbackData);
                }
            }

            // Step 2: Load the currently selected language.
            if (lang === 'en') {
                setTranslations(fallbackData);
            } else {
                try {
                    const res = await fetch(`/locales/${lang}.json`);
                    const data = await res.json();
                    setTranslations(data);
                } catch (e) {
                    console.warn(`Failed to load translations for ${lang}. Falling back to English.`, e);
                    setTranslations(fallbackData);
                }
            }
        };

        loadTranslations();
    }, [lang, fallbackTranslations]);

    const setLang = useCallback((newLang: LanguageCode) => {
        try {
            localStorage.setItem('elvarium_language', newLang);
        } catch (e) {
            console.error("Could not save language preference to localStorage.");
        }
        setLangState(newLang);
    }, []);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        if (!translations || !fallbackTranslations) {
            return key; // Return the key itself if translations aren't loaded
        }
        let translatedString = getNestedValue(translations, key) || getNestedValue(fallbackTranslations, key) || key;

        if (replacements && typeof translatedString === 'string') {
            Object.keys(replacements).forEach(placeholder => {
                translatedString = translatedString.replace(`{${placeholder}}`, String(replacements[placeholder]));
            });
        }

        return translatedString;
    }, [translations, fallbackTranslations]);
    
    const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

    // Render children only when translations are loaded to prevent errors and FOUC.
    if (!translations) {
        return null;
    }

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};