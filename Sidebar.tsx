import React, { useState, useRef } from 'react';
import { View, CharacterType, User } from './types';

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
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const authBannerInputRef = useRef<HTMLInputElement>(null);


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
            </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;