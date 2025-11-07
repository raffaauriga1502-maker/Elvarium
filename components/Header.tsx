import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as apiService from '../services/apiService';
import { useI18n } from '../contexts/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, user, onLogout }) => {
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    let isCancelled = false;
    if (user.avatarUrl) {
        apiService.resolveImageUrl(user.avatarUrl).then(url => {
            if (!isCancelled) setResolvedAvatarUrl(url);
        });
    } else {
        setResolvedAvatarUrl(null);
    }
    return () => { isCancelled = true; };
  }, [user.avatarUrl]);

  return (
    <header className="bg-crystalline shadow-md p-4 flex items-center justify-between">
       <div className="flex items-center">
        <button onClick={onMenuClick} className="text-text-primary mr-4 md:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h1 className="text-xl md:text-2xl font-semibold text-white">{title}</h1>
       </div>
       <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="text-text-secondary text-right hidden sm:block">
          <span className="font-semibold text-text-primary">{user.username}</span>
          <span className="text-xs"> ({user.role})</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary border-2 border-slate-600 overflow-hidden">
          {resolvedAvatarUrl ? (
            <img src={resolvedAvatarUrl} alt="User avatar" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-slate-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <button 
          onClick={onLogout}
          className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors text-sm"
        >
          {t('header.logout')}
        </button>
       </div>
    </header>
  );
};

export default Header;