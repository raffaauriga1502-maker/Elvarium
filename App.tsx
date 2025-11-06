import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import CharacterView from './components/CharacterView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import { View, User } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>({ type: 'home' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBannerUrl, setAuthBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('elvarium-logo');
    if (savedLogo) {
      setLogoImageUrl(savedLogo);
    }
    const loggedInUser = localStorage.getItem('elvarium-currentUser');
    if (loggedInUser) {
      setCurrentUser(JSON.parse(loggedInUser));
    }
    const savedAuthBanner = localStorage.getItem('elvarium-auth-banner');
    if (savedAuthBanner) {
        setAuthBannerUrl(savedAuthBanner);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('elvarium-currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('elvarium-currentUser');
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoImageUrl(base64String);
        localStorage.setItem('elvarium-logo', base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleAuthBannerUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        setAuthBannerUrl(base64String);
        localStorage.setItem('elvarium-auth-banner', base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('elvarium-currentUser', JSON.stringify(updatedUser));

    const storedUsers = localStorage.getItem('elvarium-users');
    const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
    const updatedUsers = users.map(u => u.username === updatedUser.username ? updatedUser : u);
    localStorage.setItem('elvarium-users', JSON.stringify(updatedUsers));
  }

  if (!currentUser) {
    return <AuthView onLogin={handleLogin} authBannerUrl={authBannerUrl} />;
  }

  const renderContent = () => {
    switch (activeView.type) {
      case 'home':
        return <HomeView userRole={currentUser.role} />;
      case 'profile':
        return <ProfileView user={currentUser} onUserUpdate={handleUserUpdate} />;
      case 'characters':
        return <CharacterView characterType={activeView.subType} userRole={currentUser.role} />;
      default:
        return <HomeView userRole={currentUser.role} />;
    }
  };

  const getTitle = () => {
     switch (activeView.type) {
      case 'home':
        return 'Home';
      case 'profile':
        return 'User Profile';
      case 'characters':
        return `Characters: ${activeView.subType}`;
      default:
        return 'Elvarium Dashboard';
    }
  }

  return (
    <div className="flex h-screen bg-primary font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        logoImageUrl={logoImageUrl}
        onLogoUpload={handleLogoUpload}
        onAuthBannerUpload={handleAuthBannerUpload}
        userRole={currentUser.role}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getTitle()} 
          onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
          user={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-primary p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
