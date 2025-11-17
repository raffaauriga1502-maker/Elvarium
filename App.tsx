
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

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await apiService.saveCurrentUser(user);
    await loadWorldAssets();

    // Check if there is a pending import *after* login
    if (pendingImport) {
        if (pendingImport.type === 'id') {
            setSharedWorldId(pendingImport.value);
        } else if (pendingImport.type === 'data') {
            setImportData(pendingImport.value);
            setImportIsCompressed(!!pendingImport.isCompressed);
        }
        setPendingImport(null); // Clear pending import
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setLogoImageUrl(null);
    setAuthBannerUrl(null);
    setActiveView({ type: 'home' });
    setIsGuestSession(false);
    await apiService.removeCurrentUser();
  };

  const handleLogoUpload = async (file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 500, maxHeight: 200 });
        await apiService.saveLogo(imageKey);
        const resolvedUrl = await apiService.resolveImageUrl(imageKey);
        setLogoImageUrl(resolvedUrl);
    } catch (error) {
        console.error("Error processing logo:", error);
        alert(t('app.errors.logoProcessing'));
    }
  };

  const handleAuthBannerUpload = async (file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 800, maxHeight: 300 });
        await apiService.saveAuthBanner(imageKey);
        const resolvedUrl = await apiService.resolveImageUrl(imageKey);
        setAuthBannerUrl(resolvedUrl);
    } catch (error) {
         console.error("Error processing auth banner:", error);
         alert(t('app.errors.authBannerProcessing'));
    }
  }
  
  const handleConfirmImport = async () => {
      try {
          let dataToImport;
          if (sharedWorldId) {
               dataToImport = await apiService.fetchSharedWorldData(sharedWorldId);
          } else if (importData) {
               let jsonString = importData;
               if (importIsCompressed) {
                  // The Base64 string from URL needs to be converted back to Uint8Array
                  // We use a modified base64 decoder that handles URL-safe strings if needed,
                  // though standard atob often works if padding is correct.
                  // For robustness, ensure standard base64 chars.
                  const base64 = importData.replace(/-/g, '+').replace(/_/g, '/');
                  const compressedBytes = base64ToUint8Array(base64);
                  jsonString = await decompressData(compressedBytes);
               } else {
                  // If raw data passed (legacy or small share), decode from base64
                  const decoded = atob(importData);
                   // Decode URI component in case of special chars, though base64 usually handles this.
                   // Actually, straightforward base64 decode for JSON string is safer.
                  jsonString = decoded;
               }
               dataToImport = JSON.parse(jsonString);
          }

          if (dataToImport) {
              await apiService.importAllData(dataToImport);
              // Refresh logic: Reload page to ensure all states (like context, caches) are fresh
               window.location.href = window.location.pathname;
          }
      } catch (error: any) {
          console.error("Import failed:", error);
          throw new Error(t('app.errors.importFailed'));
      } finally {
          setSharedWorldId(null);
          setImportData(null);
      }
  };

  const handleDismissImport = () => {
      setSharedWorldId(null);
      setImportData(null);
  };

  if (!currentUser) {
    return <AuthView onLogin={handleLogin} authBannerUrl={authBannerUrl} />;
  }

  const renderView = () => {
    switch (activeView.type) {
      case 'home':
        return <HomeView userRole={currentUser.role} />;
      case 'characters':
        return (
            <CharacterView 
                characterType={activeView.subType || 'Main Protagonist'} 
                userRole={currentUser.role}
            />
        );
      case 'profile':
        return <ProfileView user={currentUser} onUserUpdate={(u) => { setCurrentUser(u); apiService.saveCurrentUser(u); apiService.saveUsers([u]); }} />; // Simple single user update
      default:
        return <HomeView userRole={currentUser.role} />;
    }
  };

  let headerTitle = '';
  if (activeView.type === 'home') headerTitle = t('header.titleHome');
  else if (activeView.type === 'profile') headerTitle = t('header.titleProfile');
  else if (activeView.type === 'characters') headerTitle = t('header.titleCharacters', { characterType: activeView.subType || '' });

  return (
    <div className="flex h-screen overflow-hidden">
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
            title={headerTitle} 
            onMenuClick={() => setSidebarOpen(true)} 
            user={currentUser}
            onLogout={handleLogout}
            isGuestSession={isGuestSession}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {renderView()}
        </main>
      </div>
      {(sharedWorldId || importData) && (
          <ImportModal 
            onConfirm={handleConfirmImport}
            onDismiss={handleDismissImport}
          />
      )}
    </div>
  );
};

export default App;
