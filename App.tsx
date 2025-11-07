import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import CharacterView from './components/CharacterView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import ImportModal from './components/ImportModal';
import { View, User, CharacterType } from './types';
import * as apiService from './services/apiService';
import { useI18n } from './contexts/I18nContext';

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

// Interface for holding import data from a URL before the user is authenticated.
interface PendingImport {
  type: 'id' | 'data';
  value: string;
  isCompressed?: boolean;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>({ type: 'home' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBannerUrl, setAuthBannerUrl] = useState<string | null>(null);
  
  // State for triggering the import modal for already logged-in users.
  const [importData, setImportData] = useState<string | null>(null);
  const [importIsCompressed, setImportIsCompressed] = useState(false);
  const [sharedWorldId, setSharedWorldId] = useState<string | null>(null);

  // State to hold import info from a URL before user is authenticated
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  
  const [isGuestSession, setIsGuestSession] = useState(false); // Kept for any other logic, but sharing won't create guests.
  const [appDataVersion, setAppDataVersion] = useState(0);
  const { t } = useI18n();

  const loadWorldAssets = async () => {
    const [logoKey, authBannerKey] = await Promise.all([
        apiService.getLogo(),
        apiService.getAuthBanner(),
    ]);
    if (logoKey) apiService.resolveImageUrl(logoKey).then(setLogoImageUrl);
    if (authBannerKey) apiService.resolveImageUrl(authBannerKey).then(setAuthBannerUrl);
  };

  const loadInitialData = async () => {
    const user = await apiService.getCurrentUser();
    if (user) {
        setCurrentUser(user);
        await loadWorldAssets();
    }
  };
  
  useEffect(() => {
    const initializeApp = async () => {
      let foundImport: PendingImport | null = null;
      if (window.location.hash.startsWith('#id=')) {
          const id = window.location.hash.substring(4);
          if (id) foundImport = { type: 'id', value: id };
      } else if (window.location.hash.startsWith('#cdata=')) {
          const urlSafeBase64 = window.location.hash.substring(7);
          if (urlSafeBase64) foundImport = { type: 'data', value: urlSafeBase64, isCompressed: true };
      } else if (window.location.hash.startsWith('#data=')) {
          const urlSafeBase64 = window.location.hash.substring(6);
          if (urlSafeBase64) foundImport = { type: 'data', value: urlSafeBase64, isCompressed: false };
      }

      if (foundImport) {
          setPendingImport(foundImport);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      await loadInitialData();
    };
    initializeApp();
  }, []);
  
  // Effect to handle a pending import once we know if a user is logged in or not
  useEffect(() => {
    if (!pendingImport) return;

    if (currentUser) {
        // Logged-in user: show the confirmation modal to overwrite their data.
        if (pendingImport.type === 'id') {
            setSharedWorldId(pendingImport.value);
        } else {
            setImportData(pendingImport.value);
            setImportIsCompressed(!!pendingImport.isCompressed);
        }
    }
    // If there's no currentUser, AuthView will be shown. `handleLogin` will perform the import.
  }, [currentUser, pendingImport]);


  const performImport = async (source: PendingImport) => {
    try {
        let data;
        if (source.type === 'id') {
            data = await apiService.fetchSharedWorldData(source.value);
        } else { // 'data'
            let jsonString;
            const base64String = source.value.replace(/-/g, '+').replace(/_/g, '/');
            if (source.isCompressed) {
                const compressedBytes = base64ToUint8Array(base64String);
                jsonString = await decompressData(compressedBytes);
            } else {
                jsonString = decodeURIComponent(escape(window.atob(base64String)));
            }
            data = JSON.parse(jsonString);
        }

        await apiService.importAllData(data);
        await loadWorldAssets();
        setAppDataVersion(v => v + 1);

    } catch (error) {
        console.error("Failed to import data:", error);
        throw new Error(t('app.errors.importFailed'));
    }
  };


  const handleImportConfirm = async () => {
    const source = sharedWorldId 
        ? { type: 'id' as const, value: sharedWorldId }
        : { type: 'data' as const, value: importData!, isCompressed: importIsCompressed };
    
    try {
        await performImport(source);
        // Clean up modal and pending state
        setImportData(null);
        setSharedWorldId(null);
        setPendingImport(null);
    } catch (error) {
        // On error, dismiss the modal and clean up state
        setImportData(null);
        setSharedWorldId(null);
        setPendingImport(null);
        // Re-throw for the modal to display the error message
        throw error;
    }
  };

  const handleImportDismiss = () => {
    setImportData(null);
    setSharedWorldId(null);
    setPendingImport(null); // The user cancelled, so clear the pending task.
  };

  const handleLogin = async (user: User) => {
    // Set the new user as current
    setCurrentUser(user);
    await apiService.saveCurrentUser(user);
    setIsGuestSession(false);

    // If there was a pending import, perform it for the new user.
    if (pendingImport) {
        try {
            await performImport(pendingImport);
        } catch (error: any) {
            // If import fails after login, alert the user but let them continue.
            alert(error.message || t('app.errors.importFailed'));
        } finally {
            // Always clear the pending import after attempting it.
            setPendingImport(null);
        }
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await apiService.removeCurrentUser();
    setIsGuestSession(false);
  };

  const handleLogoUpload = async (file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 400, maxHeight: 400 });
        await apiService.saveLogo(imageKey);
        const resolvedUrl = await apiService.resolveImageUrl(imageKey);
        setLogoImageUrl(resolvedUrl);
    } catch (error) {
        console.error("Error processing logo image:", error);
        alert(t('app.errors.logoProcessing'));
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
        alert(t('app.errors.authBannerProcessing'));
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
          return t('header.titleHome');
        case 'profile':
          return t('header.titleProfile');
        case 'characters':
          const characterTypeLabels: Record<CharacterType, string> = {
            'Main Protagonist': t('sidebar.characterTypes.mainProtagonist'),
            'Allies': t('sidebar.characterTypes.allies'),
            'Enemies': t('sidebar.characterTypes.enemies'),
            'Main Antagonist': t('sidebar.characterTypes.enemies'),
          };
          const translatedType = characterTypeLabels[activeView.subType] || activeView.subType;
          return t('header.titleCharacters', { characterType: translatedType });
        default:
          return 'Elvarium Dashboard';
      }
    }
    return (
      <div className="flex h-screen bg-primary font-serif">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isSidebarOpen={isSidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          logoImageUrl={logoImageUrl}
          onLogoUpload={handleLogoUpload}
          onAuthBannerUpload={handleAuthBannerUpload}
          userRole={currentUser.role}
          isGuestSession={isGuestSession}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title={getTitle()} 
            onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
            user={currentUser}
            onLogout={handleLogout}
            isGuestSession={isGuestSession}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-primary p-4 md:p-8">
            <div className="max-w-7xl mx-auto" key={appDataVersion}>
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
