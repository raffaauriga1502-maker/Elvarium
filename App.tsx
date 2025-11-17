
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
    const reader = new Response(decompressedStream).body!.getReader();
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
  
  // State for triggering the import modal
  const [importData, setImportData] = useState<string | null>(null);
  const [importIsCompressed, setImportIsCompressed] = useState(false);
  const [sharedWorldId, setSharedWorldId] = useState<string | null>(null);
  const [sharedWorldSource, setSharedWorldSource] = useState<apiService.ShareSource>('dpaste');
  
  const [isGuestSession, setIsGuestSession] = useState(false);
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
    // Always load assets first so the Auth screen looks correct even before login
    await loadWorldAssets();

    const user = await apiService.getCurrentUser();
    if (user) {
        setCurrentUser(user);
    }
  };
  
  useEffect(() => {
    const initializeApp = async () => {
      // Check for share links in the URL immediately
      if (window.location.hash.startsWith('#id=')) {
          const id = window.location.hash.substring(4);
          if (id) {
              setSharedWorldId(id);
              setSharedWorldSource('dpaste');
          }
      } else if (window.location.hash.startsWith('#chunks=')) {
          const ids = window.location.hash.substring(8);
          if (ids) {
              setSharedWorldId(ids);
              setSharedWorldSource('dpaste-chunked');
          }
      } else if (window.location.hash.startsWith('#fio=')) {
          const id = window.location.hash.substring(5);
          if (id) {
              setSharedWorldId(id);
              setSharedWorldSource('fileio');
          }
      } else if (window.location.hash.startsWith('#cdata=')) {
          const urlSafeBase64 = window.location.hash.substring(7);
          if (urlSafeBase64) {
              setImportData(urlSafeBase64);
              setImportIsCompressed(true);
          }
      } else if (window.location.hash.startsWith('#data=')) {
          const urlSafeBase64 = window.location.hash.substring(6);
          if (urlSafeBase64) {
              setImportData(urlSafeBase64);
              setImportIsCompressed(false);
          }
      }

      // Clean up the URL so we don't re-trigger on refresh, but only after capturing state
      if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      await loadInitialData();
    };

    initializeApp();
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await apiService.saveCurrentUser(user);
    // Reload assets just in case, though they should be loaded already
    await loadWorldAssets();
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setActiveView({ type: 'home' });
    setIsGuestSession(false);
    await apiService.removeCurrentUser();
    // We do NOT clear logo/banner here so the login screen stays branded
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
               dataToImport = await apiService.fetchSharedWorldData(sharedWorldId, sharedWorldSource);
          } else if (importData) {
               let jsonString = importData;
               if (importIsCompressed) {
                  const base64 = importData.replace(/-/g, '+').replace(/_/g, '/');
                  const compressedBytes = base64ToUint8Array(base64);
                  jsonString = await decompressData(compressedBytes);
               } else {
                  const decoded = atob(importData);
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
          throw new Error(error.message || t('app.errors.importFailed'));
      } finally {
          setSharedWorldId(null);
          setImportData(null);
      }
  };

  const handleDismissImport = () => {
      setSharedWorldId(null);
      setImportData(null);
  };

  const renderMainApp = () => {
      const renderView = () => {
        switch (activeView.type) {
          case 'home':
            return <HomeView userRole={currentUser!.role} />;
          case 'characters':
            return (
                <CharacterView 
                    characterType={activeView.subType || 'Main Protagonist'} 
                    userRole={currentUser!.role}
                />
            );
          case 'profile':
            return <ProfileView user={currentUser!} onUserUpdate={(u) => { setCurrentUser(u); apiService.saveCurrentUser(u); apiService.saveUsers([u]); }} />;
          default:
            return <HomeView userRole={currentUser!.role} />;
        }
      };

      let headerTitle = '';
      if (activeView.type === 'home') headerTitle = t('header.titleHome');
      else if (activeView.type === 'profile') headerTitle = t('header.titleProfile');
      else if (activeView.type === 'characters') headerTitle = t('header.titleCharacters', { characterType: activeView.subType || '' });

      return (
        // Use h-[100dvh] for mobile browsers to handle address bars correctly, fallback to h-screen
        <div className="flex h-screen h-[100dvh] overflow-hidden">
          <Sidebar 
            activeView={activeView} 
            setActiveView={setActiveView} 
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
            logoImageUrl={logoImageUrl}
            onLogoUpload={handleLogoUpload}
            onAuthBannerUpload={handleAuthBannerUpload}
            userRole={currentUser!.role}
            isGuestSession={isGuestSession}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header 
                title={headerTitle} 
                onMenuClick={() => setSidebarOpen(true)} 
                user={currentUser!}
                onLogout={handleLogout}
                isGuestSession={isGuestSession}
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              {renderView()}
            </main>
          </div>
        </div>
      );
  };

  return (
    <>
      {/* Auth View or Main App */}
      {!currentUser ? (
        <AuthView onLogin={handleLogin} authBannerUrl={authBannerUrl} />
      ) : (
        renderMainApp()
      )}

      {/* Import Modal - Now sits above everything, accessible even before login */}
      {(sharedWorldId || importData) && (
          <ImportModal 
            onConfirm={handleConfirmImport}
            onDismiss={handleDismissImport}
          />
      )}
    </>
  );
};

export default App;
