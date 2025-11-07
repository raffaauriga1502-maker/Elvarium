import React, { useState, useRef } from 'react';
import { View, CharacterType, User } from './types';
import * as apiService from './services/apiService';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  logoImageUrl: string | null;
  onLogoUpload: (file: File) => void;
  onAuthBannerUpload: (file: File) => void;
  userRole: User['role'];
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
}> = ({ label, isActive, onClick, isSubLink = false }) => (
  <button
    onClick={onClick}
    className={`group w-full text-left rounded-md p-2 my-1 transition-all duration-200 ease-in-out flex items-center
      ${isSubLink ? 'pl-12' : 'pl-2'}
      ${isActive ? 'bg-accent text-white shadow-lg' : 'text-text-primary hover:bg-secondary hover:text-white'}`}
  >
    {!isSubLink && <CrystalIcon isActive={isActive} />}
    {label}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isSidebarOpen, setSidebarOpen, logoImageUrl, onLogoUpload, onAuthBannerUpload, userRole }) => {
  const [isCharactersExpanded, setCharactersExpanded] = useState(true);
  const [shareLinkStatus, setShareLinkStatus] = useState('Copy Share Link');

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const authBannerInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);


  const characterSubTypes: CharacterType[] = ['Main Protagonist', 'Allies', 'Main Antagonist', 'Enemies'];

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
    setShareLinkStatus('Generating...');
    try {
      const link = await apiService.generateShareableLink();
      await navigator.clipboard.writeText(link);
      setShareLinkStatus('Copied!');
      setTimeout(() => setShareLinkStatus('Copy Share Link'), 3000);
    } catch (error) {
        console.error("Failed to copy data to clipboard:", error);
        setShareLinkStatus('Error!');
        setTimeout(() => setShareLinkStatus('Copy Share Link'), 3000);
        alert("Could not generate the share link. The data might be too large. Try downloading the file instead.");
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
            
            if (window.confirm("Are you sure you want to import this data? This will overwrite all existing data in the application.")) {
                await apiService.importAllData(data);
                alert("Import successful! The application will now reload.");
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to import data:", error);
            alert("An error occurred during import. The file may be invalid. See console for details.");
        }
    };
    reader.readAsText(file);
    // Reset the file input so the same file can be loaded again
    event.target.value = '';
  };

  const backgroundClass = activeView.type === 'home' 
    ? 'bg-crystalline'
    : 'bg-characters-dark-blue';

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`${backgroundClass} border-r border-secondary/30 w-64 min-h-screen p-4 flex flex-col fixed md:relative z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-colors duration-500`}>
        <div className="flex items-center justify-center mb-6 px-2">
            <div className={`relative w-full h-24 rounded-lg overflow-hidden flex items-center justify-center ${userRole === 'admin' ? 'group bg-primary/50' : ''}`}>
                 {userRole === 'admin' && (
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                 )}
                {logoImageUrl ? (
                    <img src={logoImageUrl} alt="Elvarium Logo" className="w-full h-full object-contain p-2" />
                ) : (
                    <svg viewBox="0 0 400 100" className="w-full h-auto max-h-full">
                        <defs>
                            <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#38BDF8" />
                                <stop offset="50%" stopColor="#F1F5F9" />
                                <stop offset="100%" stopColor="#38BDF8" />
                            </linearGradient>
                            <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                                <feFlood floodColor="#38BDF8" floodOpacity="0.5" result="color" />
                                <feComposite in="color" in2="blur" operator="in" result="glow" />
                                <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <g filter="url(#subtleGlow)">
                        <text
                            x="50%"
                            y="45%"
                            dy=".35em"
                            textAnchor="middle"
                            fill="url(#crystalGradient)"
                            fontSize="48"
                            fontFamily="'Cinzel Decorative', serif"
                            fontWeight="700"
                            letterSpacing="2"
                            stroke="#0F172A"
                            strokeWidth="0.5"
                        >
                            ELVARIUM
                        </text>
                        </g>
                        <text
                        x="50%"
                        y="78%"
                        dy=".35em"
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="16"
                        fontFamily="'Cinzel Decorative', serif"
                        fontWeight="400"
                        fontStyle="italic"
                        letterSpacing="1"
                        >
                        The Rebirth of Hope
                        </text>
                    </svg>
                )}
                {userRole === 'admin' && (
                  <div 
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center"
                  >
                      {logoImageUrl ? (
                          <button 
                            onClick={handleLogoImageClick}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 rounded-full p-3"
                            aria-label="Change logo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                          </button>
                      ) : (
                          <button 
                              onClick={handleLogoImageClick}
                              className="bg-accent text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500 transition-colors opacity-0 group-hover:opacity-100"
                              aria-label="Upload logo"
                          >
                              Upload Logo
                          </button>
                      )}
                  </div>
                )}
            </div>
        </div>
        <nav className="flex-grow">
          <button
            onClick={() => handleNavClick({ type: 'profile' })}
            className={`group w-full text-left rounded-md p-2 my-1 transition-all duration-200 ease-in-out flex items-center pl-2 border-y-2 ${activeView.type === 'profile' ? 'border-accent/50 bg-accent/10' : 'border-transparent hover:border-accent/30'} ${activeView.type === 'profile' ? 'text-white' : 'text-text-primary hover:text-white'}`}
          >
              <UserIcon isActive={activeView.type === 'profile'} />
              <span className="font-bold tracking-wider">Profile</span>
          </button>
          <NavLink
            label="Home"
            isActive={activeView.type === 'home'}
            onClick={() => handleNavClick({ type: 'home' })}
          />
          <div>
            <button
              onClick={() => setCharactersExpanded(!isCharactersExpanded)}
              className="group w-full text-left rounded-md p-2 my-1 text-text-primary hover:bg-secondary hover:text-white flex justify-between items-center pl-2"
            >
                <span className="flex items-center">
                    <CrystalIcon isActive={activeView.type === 'characters'} />
                    Characters
                </span>
              <svg className={`w-5 h-5 transition-transform duration-300 ${isCharactersExpanded ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isCharactersExpanded ? 'max-h-96' : 'max-h-0'}`}>
              {characterSubTypes.map(subType => (
                <NavLink
                  key={subType}
                  label={subType}
                  isSubLink
                  isActive={activeView.type === 'characters' && activeView.subType === subType}
                  onClick={() => handleNavClick({ type: 'characters', subType })}
                />
              ))}
            </div>
          </div>
        </nav>

        {userRole === 'admin' && (
            <div className="mt-auto pt-4 border-t border-secondary/30 space-y-2">
                <input
                    type="file"
                    ref={authBannerInputRef}
                    onChange={handleAuthBannerFileChange}
                    accept="image/*"
                    className="hidden"
                />
                 <input
                    type="file"
                    ref={importFileInputRef}
                    onChange={handleImportFileChange}
                    accept=".json"
                    className="hidden"
                />
                <h3 className="px-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Admin Controls</h3>
                <button
                    onClick={() => authBannerInputRef.current?.click()}
                    className="group w-full text-left rounded-md p-2 text-sm text-text-primary hover:bg-secondary hover:text-white flex items-center"
                    aria-label="Upload login screen banner"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Upload Login Banner
                </button>
                <div className="pt-2">
                    <h4 className="px-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Share &amp; Backup</h4>
                    <div className="mt-1 space-y-1">
                        <button
                            onClick={handleGenerateShareLink}
                            disabled={shareLinkStatus !== 'Copy Share Link'}
                            className="group w-full text-left rounded-md p-2 text-sm text-text-primary hover:bg-secondary hover:text-white flex items-center disabled:text-text-secondary disabled:hover:bg-transparent"
                            aria-label="Generate and copy a shareable link"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            {shareLinkStatus}
                        </button>
                        <button
                            onClick={handleExportFile}
                            className="group w-full text-left rounded-md p-2 text-sm text-text-primary hover:bg-secondary hover:text-white flex items-center"
                            aria-label="Download all application data as a file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download File
                        </button>
                        <button
                            onClick={() => importFileInputRef.current?.click()}
                            className="group w-full text-left rounded-md p-2 text-sm text-text-primary hover:bg-secondary hover:text-white flex items-center"
                            aria-label="Import application data from a file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Upload File
                        </button>
                    </div>
                </div>
            </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;