
import React, { useState, FormEvent, useEffect } from 'react';
import { User } from '../types';
import * as apiService from '../services/apiService';
import { useI18n } from '../contexts/I18nContext';

interface AuthViewProps {
  onLogin: (user: User) => void;
  authBannerUrl: string | null;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, authBannerUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const checkFirstTimeSetup = async () => {
        const users = await apiService.getUsers();
        if (users.length === 0) {
            setIsLogin(false);
            setInfo(t('auth.firstTimeSetup'));
        }
    };
    checkFirstTimeSetup();
  }, [t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const users = await apiService.getUsers();

        if (isLogin) {
        // Handle Login
        const foundUser = users.find(u => u.username === username && u.password === password);
        if (foundUser) {
            onLogin(foundUser);
        } else {
            setError(t('auth.invalidCredentials'));
        }
        } else {
        // Handle Sign Up
        if (users.some(u => u.username === username)) {
            setError(t('auth.usernameExists'));
            return;
        }
        
        // Safely retrieve the secret code
        let envSecret = 'elvarium_admin_secret'; // Default fallback
        try {
             // Check for Vite style env vars first
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ADMIN_SECRET) {
                // @ts-ignore
                envSecret = import.meta.env.VITE_ADMIN_SECRET;
            } 
            // Check for process.env (standard Node/Webpack) safely
            else if (typeof process !== 'undefined' && process.env && process.env.ADMIN_SECRET) {
                envSecret = process.env.ADMIN_SECRET;
            }
        } catch (e) {
            // Ignore access errors
        }

        const newUser: User = {
            username,
            password,
            role: adminCode === envSecret ? 'admin' : 'viewer',
            bio: '',
            avatarUrl: '',
        };
        
        if (newUser.role === 'viewer' && adminCode) {
            setError(t('auth.incorrectAdminCode'));
            setIsLoading(false);
            return;
        }

        const updatedUsers = [...users, newUser];
        await apiService.saveUsers(updatedUsers);
        onLogin(newUser);
        }
    } catch (e) {
        console.error("Auth error:", e);
        setError(t('auth.errors.generic'));
    } finally {
        setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setInfo('');
    setUsername('');
    setPassword('');
    setAdminCode('');
  }

  return (
    <div className="w-full h-screen flex items-center justify-center p-4">
       <div className="w-full max-w-sm mx-auto bg-crystalline rounded-xl shadow-2xl overflow-hidden border border-secondary/50">
          <div className="h-40 bg-primary">
            {authBannerUrl ? (
                <img src={authBannerUrl} alt="Login Banner" className="w-full h-full object-cover" />
            ) : (
                <div 
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                        linear-gradient(160deg, rgba(56, 189, 248, 0.04) 5%, transparent 40%),
                        linear-gradient(340deg, rgba(56, 189, 248, 0.05) 10%, transparent 50%)
                        `
                    }}
                ></div>
            )}
          </div>
          <div className="p-8">
            <div className="text-center mb-6">
                    <h2 
                        className="text-2xl font-semibold text-white font-display"
                    >
                        {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
                    </h2>
            </div>
            
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md text-center mb-4 text-sm">{error}</p>}
            {info && !error && <p className="bg-sky-900/50 text-sky-300 p-3 rounded-md text-center mb-4 text-sm">{info}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="username">
                        {t('auth.username')}
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-secondary border border-slate-600 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition placeholder:text-slate-500"
                        placeholder={t('auth.placeholders.username')}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="password">
                        {t('auth.password')}
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-secondary border border-slate-600 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition"
                        placeholder="••••••••"
                    />
                </div>
                {!isLogin && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="adminCode">
                            {t('auth.adminCode')}
                        </label>
                        <input
                            id="adminCode"
                            type="password"
                            value={adminCode}
                            onChange={(e) => setAdminCode(e.target.value)}
                            className="w-full bg-secondary border border-slate-600 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition"
                            placeholder={t('auth.adminCodePlaceholder')}
                        />
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-md transition-colors shadow-lg hover:shadow-sky-500/30 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('auth.processing') : (isLogin ? t('auth.loginButton') : t('auth.signupButton'))}
                </button>
            </form>

            <p className="text-center text-sm text-text-secondary mt-6">
                {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
                <button onClick={handleToggleMode} className="font-semibold text-accent hover:text-sky-300 ml-2">
                    {isLogin ? t('auth.signupButton') : t('auth.loginButton')}
                </button>
            </p>
          </div>
       </div>
    </div>
  );
};

export default AuthView;
