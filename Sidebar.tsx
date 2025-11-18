
import React, { useState, useRef } from 'react';
import { View, CharacterType, User } from './types';
import * as apiService from './services/apiService';
import { useI18n } from './contexts/I18nContext';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  logoImageUrl: string | null;
  onLogoUpload: (file: File) => void;
  onAuthBannerUpload: (file: File) => void;
  userRole: User['role'];
  isGuestSession?: boolean;
}

const CrystalIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" className="mr-3 -ml-1 h-5 w-5 flex-shrink-0">
            <g className="transition-all duration-300 ease-in-out">
                <defs>
                    <filter id="crystal-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    </filter>
                </defs>
                {/* Glow effect */}
                <ellipse
                    cx="12" cy="12" rx="5" ry="8"
                    fill="currentColor"
                    className={`
                        text-accent transition-opacity duration-300
                        ${isActive ? 'opacity-70' : 'opacity-0'}
                        group-hover:opacity-50
                    `}
                    filter="url(#crystal-glow-filter)"
                />
                {/* Crystal Body */}
                <ellipse
                    cx="12" cy="12" rx="5" ry="8"
                    className={`
                        fill-current transition-colors duration-300
                        ${isActive ? 'text-accent' : 'text-sky-400/40'}
                        group-hover:text-accent/80
                    `}
                    stroke={isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
                    strokeWidth="1"
                />
                {/* Facet Lines */}
                <path
                    d="M12 4 L9 12 L12 20 M12 4 L15 12 L12 20 M7 12 L17 12"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="0.5"
                    className={`
                        transition-opacity duration-300
                        ${isActive ? 'opacity-80' : 'opacity-40'}
                        group-hover:opacity-60
                    `}
                />
            </g>
        </svg>
    );
};

const UserIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className={`mr-3 -ml-1 h-5 w-5 flex-shrink-0 transition-colors duration-300 ${isActive ? 'text-accent' : 'text-sky-400/40'} group-hover:text-accent/80`}>
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    );
};

const NavLink: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  isSubLink?: boolean;
  Icon?: React.FC<{ isActive?: boolean }>;
}> = ({ label, isActive, onClick, isSubLink = false, Icon = CrystalIcon }) => (
  <button
    onClick={onClick}
    className={`group w-full text-left rounded-md p-2 my-1 transition-all duration-200 ease-in-out flex items-center
      ${isSubLink ? 'pl-12' : 'pl-2'}
      ${isActive ? 'bg-accent text-white shadow-lg' : 'text-text-primary hover:bg-secondary hover:text-white'}`}
  >
    {!isSubLink && <Icon isActive={isActive} />}
    {label}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isSidebarOpen, setSidebarOpen, logoImageUrl, onLogoUpload, onAuthBannerUpload, userRole, isGuestSession = false }) => {
  const [isCharactersExpanded, setCharactersExpanded] = useState(true);
  const [shareStatus, setShareStatus] = useState<'idle' | 'generating' | 'copied' | 'error'>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [useSafeMode, setUseSafeMode] = useState(false);
  const { t } = useI18n();

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const authBannerInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);


  const characterSubTypes: CharacterType[] = ['Main Protagonist', 'Allies', 'Enemies'];
  
  const characterTypeLabels: Record<CharacterType, string> = {
    'Main Protagonist': t('sidebar.characterTypes.mainProtagonist'),
    'Allies': t('sidebar.characterTypes.allies'),
    'Enemies': t('sidebar.characterTypes.enemies'),
    'Main Antagonist': t('sidebar.characterTypes.enemies'), // Legacy support
  };

  const handleNavClick = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 768) { // md breakpoint
        setSidebarOpen(false);
    }
  }

  const handleLogoImageClick = () => {
    if (userRole === 'admin') {
      logoFileInputRef.current?.click();
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          onLogoUpload(file);
      }
  };

  const handleAuthBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        onAuthBannerUpload(file);
    }
  };

  const handleExportFile = async () => {
    try {
        const data = await apiService.exportAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'elvarium_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export data:", error);
        alert("An error occurred while exporting data. See console for details.");
    }
  };

  const handleGenerateShareLink = async () => {
    setShareStatus('generating');
    setProgressMessage(t('sidebar.generating'));
    try {
      const result = await apiService.generateShareableLink((status) => {
          setProgressMessage(status);
      }, useSafeMode); // Pass safe mode flag
      
      try {
          // Attempt automatic copy
          await navigator.clipboard.writeText(result.url);
          setShareStatus('copied');
          setTimeout(() => setShareStatus('idle'), 3000);
      } catch (clipboardError) {
          console.warn("Clipboard write failed, falling back to prompt:", clipboardError);
          // Fallback for mobile/permissions issues or focus loss - allows manual copy
          window.prompt(t('sidebar.copyShareLink'), result.url);
          setShareStatus('idle');
      }
      
      if (result.warning) {
          alert(result.warning);
      }
      
    } catch (error: any) {
        console.error("Failed to generate share link:", error);
        setShareStatus('error');
        // The API service now throws a user-friendly error, so we can display it directly.
        alert(error.message || t('sidebar.alerts.shareLinkErrorFallback'));
        setTimeout(() => setShareStatus('idle'), 5000);
    }
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error("Failed to read file.");
            }
            const data = JSON.parse(text);
            
            if (window.confirm(t('sidebar.prompts.importConfirm'))) {
                await apiService.importAllData(data);
                alert(t('sidebar.alerts.importSuccess'));
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to import data:", error);
            alert(t('sidebar.alerts.importError'));
        }
    };
    reader.readAsText(file);
    // Reset the file input so the same file can be loaded again
    event.target.value = '';
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div className={`fixed top-0 left-0 h-full bg-crystalline z-40 w-64 transform transition-transform md:relative md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-4">
          {/* Logo Section */}
          <div 
            className={`relative w-48 h-24 mx-auto mb-4 rounded-xl border-4 border-secondary shadow-lg overflow-hidden group ${userRole === 'admin' ? 'cursor-pointer hover:border-accent' : ''} transition-colors`}
            onClick={handleLogoImageClick}
          >
            <input type="file" ref={logoFileInputRef} onChange={handleLogoFileChange} accept="image/*" className="hidden"/>
            {logoImageUrl ? (
              <img src={logoImageUrl} alt="Logo" className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-slate-500 font-bold text-xs text-center p-2">
                {t('sidebar.uploadLogo')}
              </div>
            )}
            {userRole === 'admin' && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <p className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{t('sidebar.changeLogo')}</p>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto pr-2">
            {!isGuestSession && (
                <NavLink 
                    label={t('sidebar.profile')}
                    isActive={activeView.type === 'profile'}
                    onClick={() => handleNavClick({ type: 'profile' })}
                    Icon={UserIcon}
                />
            )}
            <NavLink 
              label={t('sidebar.home')}
              isActive={activeView.type === 'home'}
              onClick={() => handleNavClick({ type: 'home' })}
            />
            <div>
              <button onClick={() => setCharactersExpanded(!isCharactersExpanded)} className="group w-full text-left rounded-md p-2 my-1 text-text-primary hover:bg-secondary hover:text-white flex items-center justify-between">
                <div className="flex items-center">
                  <CrystalIcon isActive={activeView.type === 'characters'} />
                  {t('sidebar.characters')}
                </div>
                <svg className={`w-5 h-5 transition-transform ${isCharactersExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {isCharactersExpanded && (
                <div className="pl-4 border-l-2 border-secondary/50 ml-4">
                  {characterSubTypes.map(subType => (
                    <NavLink
                      key={subType}
                      label={characterTypeLabels[subType]}
                      isActive={activeView.type === 'characters' && activeView.subType === subType}
                      onClick={() => handleNavClick({ type: 'characters', subType })}
                      isSubLink
                    />
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Admin & Share Controls */}
          <div className="mt-4 pt-4 border-t border-secondary/50 space-y-2">
            {!isGuestSession && userRole === 'admin' && (
              <div className="p-2 bg-primary/50 rounded-lg">
                <h3 className="text-xs font-semibold uppercase text-text-secondary mb-2 pl-2">{t('sidebar.adminControls')}</h3>
                <input type="file" ref={authBannerInputRef} onChange={handleAuthBannerFileChange} accept="image/*" className="hidden"/>
                <button onClick={() => authBannerInputRef.current?.click()} className="w-full text-left text-sm p-2 rounded-md text-text-primary hover:bg-secondary hover:text-white transition-colors">{t('sidebar.uploadLoginBanner')}</button>
              </div>
            )}
             {!isGuestSession && (
              <div className="p-2 bg-primary/50 rounded-lg">
                <h3 className="text-xs font-semibold uppercase text-text-secondary mb-2 pl-2">{t('sidebar.shareAndBackup')}</h3>
                <button 
                    onClick={handleGenerateShareLink} 
                    disabled={shareStatus === 'generating'}
                    className="w-full text-left text-sm p-2 rounded-md text-text-primary hover:bg-secondary hover:text-white transition-colors disabled:opacity-70 disabled:cursor-wait"
                    aria-label={t('sidebar.aria.generateShareLink')}
                >
                    {shareStatus === 'idle' && t('sidebar.copyShareLink')}
                    {shareStatus === 'generating' && (progressMessage || t('sidebar.generating'))}
                    {shareStatus === 'copied' && t('sidebar.copied')}
                    {shareStatus === 'error' && t('sidebar.error')}
                </button>
                <label className="flex items-center gap-2 px-2 mt-1 mb-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={useSafeMode} 
                        onChange={(e) => setUseSafeMode(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-accent focus:ring-accent bg-primary"
                    />
                    <span className="text-xs text-text-secondary group-hover:text-amber-400 transition-colors select-none">
                        Safe Mode (Very Slow Upload)
                    </span>
                </label>
                <button onClick={handleExportFile} className="w-full text-left text-sm p-2 rounded-md text-text-primary hover:bg-secondary hover:text-white transition-colors" aria-label={t('sidebar.aria.downloadData')}>{t('sidebar.downloadFile')}</button>
                <input type="file" ref={importFileInputRef} onChange={handleImportFileChange} accept=".json" className="hidden"/>
                <button onClick={() => importFileInputRef.current?.click()} className="w-full text-left text-sm p-2 rounded-md text-text-primary hover:bg-secondary hover:text-white transition-colors" aria-label={t('sidebar.aria.importData')}>{t('sidebar.uploadFile')}</button>
              </div>
             )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
