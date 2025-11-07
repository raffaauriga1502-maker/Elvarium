import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import CharacterView from './components/CharacterView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import ImportModal from './components/ImportModal';
import { View, User } from './types';
import * as apiService from './services/apiService';

const isQuotaExceededError = (error: any) => {
    return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
};

// --- Decompression Helpers ---
async function decompressData(compressed: Uint8Array): Promise<string> {
    const stream = new Blob([compressed]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const reader = new Response(decompressedStream).body.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);
    return blob.text();
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}
// --- End Decompression Helpers ---

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>({ type: 'home' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBannerUrl, setAuthBannerUrl] = useState<string | null>(null);
  const [importData, setImportData] = useState<string | null>(null);
  const [importIsCompressed, setImportIsCompressed] = useState(false);
  const [sharedWorldId, setSharedWorldId] = useState<string | null>(null);

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
  
  useEffect(() => {
    const initializeApp = async () => {
      // New: Check for remote share link first
      if (window.location.hash.startsWith('#id=')) {
        const id = window.location.hash.substring(4);
        if (id) {
            setSharedWorldId(id);
            return;
        }
      }
      // Check for new compressed data format first
      if (window.location.hash.startsWith('#cdata=')) {
        const urlSafeBase64 = window.location.hash.substring(7); // #cdata=
        if (urlSafeBase64) {
          setImportData(urlSafeBase64);
          setImportIsCompressed(true);
          return;
        }
      }
      // Fallback for old, uncompressed links
      if (window.location.hash.startsWith('#data=')) {
        const urlSafeBase64 = window.location.hash.substring(6);
        if (urlSafeBase64) {
          setImportData(urlSafeBase64);
          setImportIsCompressed(false);
          return;
        }
      }
      await loadInitialData();
    };
    initializeApp();
  }, []);

  const handleImportConfirm = async () => {
    try {
      let data;
      if (sharedWorldId) {
        data = await apiService.fetchSharedWorldData(sharedWorldId);
      } else if (importData) {
        let jsonString;
        const base64String = importData.replace(/-/g, '+').replace(/_/g, '/');
        
        if (importIsCompressed) {
          const compressedBytes = base64ToUint8Array(base64String);
          jsonString = await decompressData(compressedBytes);
        } else {
          // Old way, for backwards compatibility
          jsonString = decodeURIComponent(escape(window.atob(base64String)));
        }
        data = JSON.parse(jsonString);
      } else {
        return; // Should not happen
      }

      await apiService.importAllData(data);
      setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Failed to import data:", error);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Re-throw with a user-friendly message for the modal to catch
      throw new Error("Could not load the shared world. The link might be corrupted, expired, or invalid.");
    }
  };

  const handleImportDismiss = () => {
    setImportData(null);
    setImportIsCompressed(false);
    setSharedWorldId(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    loadInitialData(); // Load regular data after dismissing
  };

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
        throw error;
    }
  }

  const renderAppContent = () => {
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
  }

  return (
    <>
      {(importData || sharedWorldId) && (
        <ImportModal onConfirm={handleImportConfirm} onDismiss={handleImportDismiss} />
      )}
      {/* Render app content only when the modal is not active to prevent flashing of old content */}
      {!(importData || sharedWorldId) && renderAppContent()}
    </>
  );
};

export default App;
