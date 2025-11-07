import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { translations as enTranslations } from '../locales/en';

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

    const [translations, setTranslations] = useState<Record<string, any>>(enTranslations);

    useEffect(() => {
        const loadTranslations = async () => {
            if (lang === 'en') {
                setTranslations(enTranslations);
                return;
            }
            try {
                // Use dynamic import to lazy-load the language module
                const module = await import(`../locales/${lang}.ts`);
                setTranslations(module.translations);
            } catch (e) {
                console.warn(`Failed to load translations for ${lang}. Falling back to English.`, e);
                setTranslations(enTranslations);
            }
        };

        loadTranslations();
    }, [lang]);

    const setLang = useCallback((newLang: LanguageCode) => {
        try {
            localStorage.setItem('elvarium_language', newLang);
        } catch (e) {
            console.error("Could not save language preference to localStorage.");
        }
        setLangState(newLang);
    }, []);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        // Fallback translations are now built-in via the 'en' import
        const fallbackTranslations = enTranslations;
        let translatedString = getNestedValue(translations, key) || getNestedValue(fallbackTranslations, key) || key;

        if (replacements && typeof translatedString === 'string') {
            Object.keys(replacements).forEach(placeholder => {
                translatedString = translatedString.replace(`{${placeholder}}`, String(replacements[placeholder]));
            });
        }

        return translatedString;
    }, [translations]);
    
    const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

    // No need to check for translations loading anymore, as we have a default state
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
