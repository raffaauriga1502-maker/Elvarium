import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import * as apiService from '../services/apiService';

interface CharacterAvatarProps {
  character?: Character;
  isLoading?: boolean;
  onClick?: () => void;
}

const useResolvedAvatarUrl = (character?: Character) => {
    const [url, setUrl] = useState<string | null>(null);
    const avatarKey = character?.portraitImageUrl;

    useEffect(() => {
        let isCancelled = false;
        if (avatarKey) {
            apiService.resolveImageUrl(avatarKey).then(resolvedUrl => {
                if (!isCancelled) {
                    setUrl(resolvedUrl);
                }
            });
        } else {
            setUrl(null);
        }
        return () => {
            isCancelled = true;
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        };
    }, [avatarKey]);

    return url;
};


const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ character, isLoading = false, onClick }) => {
  const resolvedAvatarUrl = useResolvedAvatarUrl(character);
  
  if (isLoading) {
    return (
      <div className="w-32 h-32 md:w-40 md:h-40 animate-pulse bg-primary rounded-xl"></div>
    );
  }

  if (!character) return null;

  return (
    <button
      onClick={onClick}
      className="group transition-transform transform hover:scale-105"
      aria-label={`View details for ${character.name}`}
    >
      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-4 border-secondary group-hover:border-accent transition-colors duration-300 shadow-lg">
        {resolvedAvatarUrl ? (
          <img src={resolvedAvatarUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary flex items-center justify-center">
             <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 75%, transparent 75%, transparent)',
                  backgroundSize: '40px 40px',
                  animation: 'subtle-shimmer 5s linear infinite'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full p-1.5 md:p-2 bg-black/60 backdrop-blur-sm">
            <h3 className="font-semibold text-white text-sm md:text-base text-center truncate">{character.name}</h3>
        </div>
      </div>
    </button>
  );
};

export default CharacterAvatar;