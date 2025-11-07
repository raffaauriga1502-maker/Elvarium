import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';

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
        const fetchTranslations = async () => {
            try {
                const [enRes, langRes] = await Promise.all([
                    fetch('/locales/en.json'),
                    // Avoid fetching english twice if it's the selected language
                    lang === 'en' ? Promise.resolve(null) : fetch(`/locales/${lang}.json`)
                ]);

                if (!enRes.ok) throw new Error('Failed to load English fallback translations.');
                const enData = await enRes.json();
                setFallbackTranslations(enData);

                if (langRes) {
                    if (!langRes.ok) throw new Error(`Failed to load translations for ${lang}.`);
                    const langData = await langRes.json();
                    setTranslations(langData);
                } else {
                    setTranslations(enData);
                }
            } catch (error) {
                console.error(error);
                // On error, try to set fallback if available, otherwise empty
                setTranslations(fallbackTranslations || {});
            }
        };

        fetchTranslations();
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
        // Wait until translations are loaded to prevent flashing untranslated text
        if (!translations || !fallbackTranslations) return '';

        let translatedString = getNestedValue(translations, key) || getNestedValue(fallbackTranslations, key) || key;

        if (replacements && typeof translatedString === 'string') {
            Object.keys(replacements).forEach(placeholder => {
                translatedString = translatedString.replace(`{${placeholder}}`, String(replacements[placeholder]));
            });
        }

        return translatedString;
    }, [translations, fallbackTranslations]);
    
    const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

    // Render children only when translations are ready to avoid a flash of untranslated content
    if (!translations || !fallbackTranslations) {
        return null; // Or a full-screen loader component
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
