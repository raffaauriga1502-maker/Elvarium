
import React, { useState, useEffect } from 'react';
import { Character, CharacterType, User } from '../types';
import CharacterCard from './CharacterCard';
import ViewHeader from './ViewHeader';
import CharacterAvatar from './CharacterAvatar';
import RelationshipGraph from './RelationshipGraph';
import * as apiService from '../services/apiService';
import { useI18n } from '../contexts/I18nContext';

interface CharacterViewProps {
  characterType: CharacterType;
  userRole: User['role'];
}

const isQuotaExceededError = (error: any) => {
    return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
};

const CharacterView: React.FC<CharacterViewProps> = ({ characterType, userRole }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);
  const [isNewlyAddedSelected, setIsNewlyAddedSelected] = useState(false);
  const [allArcs, setAllArcs] = useState<string[]>([]);
  const [selectedArc, setSelectedArc] = useState<string>('All Arcs');
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const { t } = useI18n();
  
  useEffect(() => {
    const loadData = async () => {
      let savedCharacters = await apiService.getCharacters(characterType) || [];
      const arcs = await apiService.getAllArcs();
      const bgKey = await apiService.getCharactersBackground();
      setAllArcs(arcs);
      if (bgKey) {
          apiService.resolveImageUrl(bgKey).then(setBgUrl);
      }

      // --- MIGRATION LOGIC ---
      let dataWasChanged = false;

      // 1. Migrate Main Antagonists into Enemies
      if (characterType === 'Enemies') {
          const mainAntagonists = await apiService.getCharacters('Main Antagonist');
          if (mainAntagonists && mainAntagonists.length > 0) {
              savedCharacters = [...savedCharacters, ...mainAntagonists];
              await apiService.removeCharacters('Main Antagonist');
              dataWasChanged = true; // Needs resaving
          }
      }

      // 2. Migrate data structure to new Portrait system and add `arcs` property
      const migratedCharacters = savedCharacters.map(char => {
          let needsUpdate = false;
          let newChar: Character = { ...char };

          // Add `arcs` array if it doesn't exist
          if (!newChar.arcs) {
              newChar.arcs = [];
              needsUpdate = true;
          }
          
           // Initialize relationshipLinks if missing
          if (!newChar.relationshipLinks) {
              newChar.relationshipLinks = [];
              needsUpdate = true;
          }

          // Check for old `portraitImageUrl`/`outfits` structure
          const legacyChar = char as any;
          if ('portraitImageUrl' in legacyChar || 'outfits' in legacyChar) {
              newChar.portraits = [{
                  id: crypto.randomUUID(),
                  name: 'Default Portrait',
                  imageUrl: legacyChar.portraitImageUrl || '',
                  outfits: legacyChar.outfits || [{ id: crypto.randomUUID(), arcName: 'Default', imageUrl: '' }]
              }];
              delete (newChar as any).portraitImageUrl;
              delete (newChar as any).outfits;
              needsUpdate = true;
          } else if (!newChar.portraits || newChar.portraits.length === 0) { // Ensure portraits array exists
               newChar.portraits = [{
                  id: crypto.randomUUID(),
                  name: 'Default Portrait',
                  imageUrl: '',
                  outfits: [{ id: crypto.randomUUID(), arcName: 'Default', imageUrl: '' }]
              }];
              needsUpdate = true;
          }
          
          if (needsUpdate) dataWasChanged = true;
          return newChar;
      });

      if (dataWasChanged) {
          await apiService.saveCharacters(characterType, migratedCharacters);
      }
      // --- END MIGRATION ---
      
      setCharacters(migratedCharacters);
      setSelectedCharacterIndex(null);
      setIsNewlyAddedSelected(false);
    };
    loadData();
  }, [characterType]);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             try {
                const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.8 });
                await apiService.saveCharactersBackground(imageKey);
                const resolved = await apiService.resolveImageUrl(imageKey);
                setBgUrl(resolved);
            } catch (error) {
                console.error("Error processing background:", error);
            }
        }
    };

  const saveCharacters = async (updatedCharacters: Character[]) => {
      const oldCharacters = characters;
      setCharacters(updatedCharacters); // Optimistic update
      try {
        await apiService.saveCharacters(characterType, updatedCharacters);
      } catch(error) {
          console.error("Failed to save characters:", error);
          if (isQuotaExceededError(error)) {
              alert(t('characters.errors.saveQuota'));
          } else {
              alert(t('characters.errors.saveGeneric'));
          }
          setCharacters(oldCharacters); // Rollback
      }
  }
  
  const handleAddCharacter = () => {
    const newCharacter: Character = {
        id: crypto.randomUUID(),
        name: t('characters.newCharacter.name'),
        alias: '',
        status: 'Alive', // Standardized key
        birthplace: t('characters.newCharacter.unknown'),
        age: t('characters.newCharacter.unknown'),
        height: t('characters.newCharacter.unknown'),
        weight: t('characters.newCharacter.unknown'),
        bloodType: t('characters.newCharacter.unknown'),
        isNpc: false,
        about: '', // Default empty since the text field is hidden
        biography: t('characters.newCharacter.biography'),
        personality: t('characters.newCharacter.personality'),
        appearanceDescription: t('characters.newCharacter.appearanceDescription'),
        powers: t('characters.newCharacter.powers'),
        relationships: t('characters.newCharacter.relationships'),
        relationshipLinks: [],
        trivia: t('characters.newCharacter.trivia'),
        portraits: [{
          id: crypto.randomUUID(),
          name: t('characters.newCharacter.defaultPortraitName'),
          imageUrl: '',
          outfits: [{ id: crypto.randomUUID(), arcName: t('characters.newCharacter.defaultArcName'), imageUrl: '' }]
        }],
        arcs: [],
        gallery: [],
        stats: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
        },
    };
    const updatedCharacters = [...characters, newCharacter];
    saveCharacters(updatedCharacters);
    setSelectedCharacterIndex(updatedCharacters.length - 1);
    setIsNewlyAddedSelected(true);
    setViewMode('grid'); // Force switch to grid to see the card
  };

  const selectedCharacter = selectedCharacterIndex !== null ? characters[selectedCharacterIndex] : null;

  const handleCharacterUpdate = (updatedCharacter: Character) => {
    if (selectedCharacterIndex === null) return;
    const updatedCharacters = characters.map((char, index) => 
      index === selectedCharacterIndex ? updatedCharacter : char
    );
    saveCharacters(updatedCharacters);
    setIsNewlyAddedSelected(false);
  };

  const handleCharacterDelete = (id: string) => {
    if(window.confirm(t('characterCard.deleteConfirm'))) {
        const updatedCharacters = characters.filter(char => char.id !== id);
        saveCharacters(updatedCharacters);
        setSelectedCharacterIndex(null);
        setIsNewlyAddedSelected(false);
    }
  };
  
  const handleGraphNodeSelect = (id: string) => {
      // We can only select characters that are in the current view list
      const index = characters.findIndex(c => c.id === id);
      if (index !== -1) {
          setSelectedCharacterIndex(index);
      } else {
          alert("This character belongs to a different category.");
      }
  }

  const filteredCharacters = selectedArc === 'All Arcs'
    ? characters
    : characters.filter(char => char.arcs.includes(selectedArc));
  
  const renderContent = () => {
    if (viewMode === 'graph' && filteredCharacters.length > 0) {
        return (
            <div className="col-span-full animate-fade-in">
                <RelationshipGraph 
                    characters={filteredCharacters} 
                    onSelectCharacter={handleGraphNodeSelect} 
                />
            </div>
        );
    }

    if (filteredCharacters.length === 0) {
        let message;
        if (characters.length > 0) {
            message = t('characters.noCharactersForArc', { arcName: selectedArc });
        } else {
            const cta = userRole === 'admin' ? t('characters.adminCta') : '';
            message = t('characters.noCharactersYet', { cta });
        }
        return <div className="col-span-full text-center text-text-secondary py-10">{message}</div>
    }

    // Special layout for 'Allies' tab to separate NPCs
    if (characterType === 'Allies') {
        const regulars = filteredCharacters.filter(c => !c.isNpc);
        const npcs = filteredCharacters.filter(c => c.isNpc);

        return (
             <div className="col-span-full space-y-8">
                {regulars.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8 justify-items-center">
                        {regulars.map((character) => {
                             const originalIndex = characters.findIndex(c => c.id === character.id);
                             return (
                                 <CharacterAvatar 
                                    key={character.id} 
                                    character={character} 
                                    onClick={() => {
                                        setSelectedCharacterIndex(originalIndex);
                                        setIsNewlyAddedSelected(false);
                                    }}
                                />
                             );
                        })}
                    </div>
                )}
                
                {npcs.length > 0 && (
                    <>
                         {regulars.length > 0 && <div className="border-t border-secondary/50 my-4 w-full"></div>}
                         <h3 className="text-2xl text-accent font-display text-center mb-4 flex items-center justify-center gap-4">
                            <span className="h-px w-12 bg-accent/50 inline-block"></span>
                            {t('characters.npcSection')}
                            <span className="h-px w-12 bg-accent/50 inline-block"></span>
                         </h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8 justify-items-center">
                            {npcs.map((character) => {
                                const originalIndex = characters.findIndex(c => c.id === character.id);
                                return (
                                    <CharacterAvatar 
                                        key={character.id} 
                                        character={character} 
                                        onClick={() => {
                                            setSelectedCharacterIndex(originalIndex);
                                            setIsNewlyAddedSelected(false);
                                        }}
                                    />
                                );
                            })}
                         </div>
                    </>
                )}
            </div>
        );
    }

    // Standard grid for other character types
    return (
        <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8 justify-items-center">
            {filteredCharacters.map((character) => {
                const originalIndex = characters.findIndex(c => c.id === character.id);
                return (
                    <CharacterAvatar 
                    key={character.id} 
                    character={character} 
                    onClick={() => {
                        setSelectedCharacterIndex(originalIndex);
                        setIsNewlyAddedSelected(false);
                    }}
                    />
                )
            })}
        </div>
    );
  };

  const renderDetailView = () => {
    if (!selectedCharacter) return null;
    return (
      <div className="mt-6 animate-fade-in">
        <button 
            onClick={() => {
                setSelectedCharacterIndex(null);
                setIsNewlyAddedSelected(false);
            }}
            className="mb-6 flex items-center gap-2 text-accent hover:text-sky-300 transition-colors font-semibold"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {t('characters.backTo', { characterType: translatedCharacterType })}
        </button>
        <CharacterCard 
            character={selectedCharacter}
            isNewlyAdded={isNewlyAddedSelected}
            onUpdate={handleCharacterUpdate}
            onDelete={handleCharacterDelete}
            userRole={userRole}
        />
      </div>
    );
  };
  
  const characterTypeLabels: Record<CharacterType, string> = {
    'Main Protagonist': t('sidebar.characterTypes.mainProtagonist'),
    'Allies': t('sidebar.characterTypes.allies'),
    'Enemies': t('sidebar.characterTypes.enemies'),
    'Main Antagonist': t('sidebar.characterTypes.enemies'), // Legacy support
  };
  const translatedCharacterType = characterTypeLabels[characterType] || characterType;
  
  return (
    <div className="min-h-full p-6 md:p-8 relative">
        {/* Dedicated Fixed Background Layer */}
        {bgUrl && (
            <div 
            className="fixed inset-0 md:left-64 z-0"
            style={{
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(${bgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
            />
        )}

        {userRole === 'admin' && !selectedCharacter && (
             <div className="absolute top-4 right-4 z-20">
                <label className="bg-secondary/80 hover:bg-secondary text-text-primary p-2 rounded-full cursor-pointer transition-colors backdrop-blur-sm flex items-center justify-center shadow-md border border-slate-600" title={t('characterCard.editBackground')}>
                    <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                </label>
             </div>
         )}
      <div className="max-w-7xl mx-auto relative z-10">
        <ViewHeader title={translatedCharacterType}>
            {!selectedCharacter && (
            <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="bg-secondary rounded-lg p-1 flex items-center border border-slate-600">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            viewMode === 'grid' 
                                ? 'bg-accent text-white shadow-sm' 
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title={t('characters.viewMode.grid')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            viewMode === 'graph' 
                                ? 'bg-accent text-white shadow-sm' 
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title={t('characters.viewMode.graph')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                    </button>
                </div>

                {allArcs.length > 0 && (
                <div className="relative">
                    <select
                        value={selectedArc}
                        onChange={(e) => setSelectedArc(e.target.value)}
                        className="bg-secondary text-text-primary font-semibold py-2 pl-3 pr-8 rounded-md appearance-none focus:ring-accent focus:border-accent transition-colors"
                        aria-label={t('characters.aria.filterByArc')}
                    >
                        <option value="All Arcs">{t('characters.allArcs')}</option>
                        {allArcs.map(arc => <option key={arc} value={arc}>{arc}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
                )}
                {userRole === 'admin' && (
                <button
                    onClick={handleAddCharacter}
                    className="bg-accent hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    {t('characters.addCharacter')}
                </button>
                )}
            </div>
            )}
        </ViewHeader>
        {selectedCharacter ? renderDetailView() : (
            <div className="mt-6">
                {renderContent()}
            </div>
        )}
      </div>
    </div>
  );
};

export default CharacterView;
