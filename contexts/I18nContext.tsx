import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { translations as en } from '../locales/en';
import { translations as es } from '../locales/es';
import { translations as fr } from '../locales/fr';
import { translations as de } from '../locales/de';
import { translations as id } from '../locales/id';

export const supportedLanguages = {
    en: { flag: '🇬🇧' },
    es: { flag: '🇪🇸' },
    fr: { flag: '🇫🇷' },
    de: { flag: '🇩🇪' },
    id: { flag: '🇮🇩' },
};

export type LanguageCode = keyof typeof supportedLanguages;

const TRANSLATIONS: Record<LanguageCode, any> = {
    en,
    es,
    fr,
    de,
    id,
};

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

    const setLang = useCallback((newLang: LanguageCode) => {
        try {
            localStorage.setItem('elvarium_language', newLang);
        } catch (e) {
            console.error("Could not save language preference to localStorage.");
        }
        setLangState(newLang);
    }, []);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        const currentTranslations = TRANSLATIONS[lang] || TRANSLATIONS['en'];
        const fallbackTranslations = TRANSLATIONS['en'];
        
        let translatedString = getNestedValue(currentTranslations, key) || getNestedValue(fallbackTranslations, key) || key;

        if (replacements && typeof translatedString === 'string') {
            Object.keys(replacements).forEach(placeholder => {
                translatedString = translatedString.replace(`{${placeholder}}`, String(replacements[placeholder]));
            });
        }

        return translatedString;
    }, [lang]);
    
    const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

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