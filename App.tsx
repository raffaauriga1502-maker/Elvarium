import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import CharacterView from './components/CharacterView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import { View, User } from './types';
import * as apiService from './services/apiService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>({ type: 'home' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBannerUrl, setAuthBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const [savedLogo, loggedInUser, savedAuthBanner] = await Promise.all([
        apiService.getLogo(),
        apiService.getCurrentUser(),
        apiService.getAuthBanner(),
      ]);
      if (savedLogo) setLogoImageUrl(savedLogo);
      if (loggedInUser) setCurrentUser(loggedInUser);
      if (savedAuthBanner) setAuthBannerUrl(savedAuthBanner);
    };
    loadInitialData();
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await apiService.saveCurrentUser(user);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await apiService.removeCurrentUser();
  };

  const handleLogoUpload = async (file: File) => {
    try {
        const base64String = await apiService.imageFileToBase64(file, 400, 400);
        setLogoImageUrl(base64String);
        await apiService.saveLogo(base64String);
    } catch (error) {
        console.error("Error processing logo image:", error);
        alert("There was an error processing the logo image. It may be an unsupported format.");
    }
  };

  const handleAuthBannerUpload = async (file: File) => {
    try {
        const base64String = await apiService.imageFileToBase64(file, 800, 400, 0.8);
        setAuthBannerUrl(base64String);
        await apiService.saveAuthBanner(base64String);
    } catch (error) {
        console.error("Error processing auth banner image:", error);
        alert("There was an error processing the auth banner image. It may be an unsupported format.");
    }
  };

  const handleUserUpdate = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    await apiService.saveCurrentUser(updatedUser);

    const users = await apiService.getUsers();
    const updatedUsers = users.map(u => u.username === updatedUser.username ? updatedUser : u);
    await apiService.saveUsers(updatedUsers);
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
