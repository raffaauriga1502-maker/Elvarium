import React, { useState, useRef, useEffect } from 'react';
import { useI18n, supportedLanguages, LanguageCode } from '../contexts/I18nContext';

const LanguageSwitcher: React.FC = () => {
    const { lang, setLang, t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleSelect = (selectedLang: LanguageCode) => {
        setLang(selectedLang);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary border-2 border-slate-600 hover:border-accent transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label={t('languageSwitcher.aria.changeLanguage')}
            >
                <span className="text-lg">{supportedLanguages[lang].flag}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-crystalline rounded-md shadow-lg z-50 border border-secondary/50">
                    <ul className="py-1">
                        {Object.entries(supportedLanguages).map(([code, { flag }]) => (
                            <li key={code}>
                                <button
                                    onClick={() => handleSelect(code as LanguageCode)}
                                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-secondary flex items-center gap-3"
                                >
                                    <span className="text-lg">{flag}</span>
                                    <span>{t(`languages.${code}`)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;