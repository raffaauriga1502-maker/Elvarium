import React, { useState, FormEvent, useEffect } from 'react';
import { User } from '../types';
import * as apiService from '../services/apiService';

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

  useEffect(() => {
    const checkFirstTimeSetup = async () => {
        const users = await apiService.getUsers();
        if (users.length === 0) {
            setIsLogin(false);
            setInfo('This appears to be the first time setup. Create your admin account by providing the secret Admin Code.');
        }
    };
    checkFirstTimeSetup();
  }, []);

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
            setError('Invalid username or password.');
        }
        } else {
        // Handle Sign Up
        if (users.some(u => u.username === username)) {
            setError('Username already exists.');
            return;
        }
        
        // The secret code is securely managed as an environment variable.
        // A fallback is provided for local development if the variable isn't set.
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'elvarium_admin_secret';

        const newUser: User = {
            username,
            password,
            role: adminCode === ADMIN_SECRET ? 'admin' : 'viewer',
            bio: '',
            avatarUrl: '',
        };
        
        if (newUser.role === 'viewer' && adminCode) {
            setError('Incorrect Admin Code. Registered as a viewer.');
        }

        const updatedUsers = [...users, newUser];
        await apiService.saveUsers(updatedUsers);
        onLogin(newUser);
        }
    } catch (e) {
        console.error("Auth error:", e);
        setError("An unexpected error occurred during authentication.");
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
    <div className="w-full h-screen flex items-center justify-center bg-primary p-4">
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
                        className="text-2xl font-semibold text-white" 
                        style={{ fontFamily: "'Cinzel Decorative', serif" }}
                    >
                        {isLogin ? 'Welcome Back' : 'Create an Account'}
                    </h2>
            </div>
            
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md text-center mb-4 text-sm">{error}</p>}
            {info && !error && <p className="bg-sky-900/50 text-sky-300 p-3 rounded-md text-center mb-4 text-sm">{info}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-secondary border border-slate-600 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition placeholder:text-slate-500"
                        placeholder="e.g., elara_storm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="password">
                        Password
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
                            Admin Code (Optional)
                        </label>
                        <input
                            id="adminCode"
                            type="password"
                            value={adminCode}
                            onChange={(e) => setAdminCode(e.target.value)}
                            className="w-full bg-secondary border border-slate-600 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition"
                            placeholder="Enter secret code for admin access"
                        />
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-md transition-colors shadow-lg hover:shadow-sky-500/30 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                </button>
            </form>

            <p className="text-center text-sm text-text-secondary mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button onClick={handleToggleMode} className="font-semibold text-accent hover:text-sky-300 ml-2">
                    {isLogin ? 'Sign Up' : 'Log In'}
                </button>
            </p>
          </div>
       </div>
    </div>
  );
};

export default AuthView;
