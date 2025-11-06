import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import CharacterView from './components/CharacterView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import { View, User } from './types';
import * as apiService from './services/apiService';

const isQuotaExceededError = (error: any) => {
    return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>({ type: 'home' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBannerUrl, setAuthBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
        const [logoKey, loggedInUser, authBannerKey] = await Promise.all([
            apiService.getLogo(),
            apiService.getCurrentUser(),
            apiService.getAuthBanner(),
        ]);
        if (logoKey) apiService.resolveImageUrl(logoKey).then(setLogoImageUrl);
        if (loggedInUser) setCurrentUser(loggedInUser);
        if (authBannerKey) apiService.resolveImageUrl(authBannerKey).then(setAuthBannerUrl);
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
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 400, maxHeight: 400 });
        await apiService.saveLogo(imageKey);
        const resolvedUrl = await apiService.resolveImageUrl(imageKey);
        setLogoImageUrl(resolvedUrl);
    } catch (error) {
        console.error("Error processing logo image:", error);
        alert("There was an error processing the logo image. It may be an unsupported format.");
    }
  };

  const handleAuthBannerUpload = async (file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 800, maxHeight: 400, quality: 0.8 });
        await apiService.saveAuthBanner(imageKey);
        const resolvedUrl = await apiService.resolveImageUrl(imageKey);
        setAuthBannerUrl(resolvedUrl);
    } catch (error) {
        console.error("Error processing auth banner image:", error);
        alert("There was an error processing the auth banner image. It may be an unsupported format.");
    }
  };

  const handleUserUpdate = async (updatedUser: User) => {
    const oldUser = currentUser;
    setCurrentUser(updatedUser); // Optimistic update
    try {
        await apiService.saveCurrentUser(updatedUser);

        const users = await apiService.getUsers();
        const updatedUsers = users.map(u => u.username === updatedUser.username ? updatedUser : u);
        await apiService.saveUsers(updatedUsers);
    } catch (error) {
        console.error("Failed to update user:", error);
        if (oldUser) setCurrentUser(oldUser); // Rollback
        // Re-throw so ProfileView can show an alert
        throw error;
    }
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