import React, { useState, useEffect } from 'react';
import { Character, CharacterType, User } from '../types';
import CharacterCard from './CharacterCard';
import ViewHeader from './ViewHeader';
import CharacterAvatar from './CharacterAvatar';
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
  const { t } = useI18n();
  
  useEffect(() => {
    const loadData = async () => {
      let savedCharacters = await apiService.getCharacters(characterType) || [];
      const arcs = await apiService.getAllArcs();
      setAllArcs(arcs);

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
        status: t('characterCard.statusOptions.alive'),
        birthplace: t('characters.newCharacter.unknown'),
        age: t('characters.newCharacter.unknown'),
        height: t('characters.newCharacter.unknown'),
        weight: t('characters.newCharacter.unknown'),
        bloodType: t('characters.newCharacter.unknown'),
        about: t('characters.newCharacter.about'),
        biography: t('characters.newCharacter.biography'),
        personality: t('characters.newCharacter.personality'),
        appearanceDescription: t('characters.newCharacter.appearanceDescription'),
        powers: t('characters.newCharacter.powers'),
        relationships: t('characters.newCharacter.relationships'),
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

  const filteredCharacters = selectedArc === 'All Arcs'
    ? characters
    : characters.filter(char => char.arcs.includes(selectedArc));
  
  const renderGallery = () => {
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
    return filteredCharacters.map((character) => {
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
    });
  };

  const renderDetailView = () => {
    if (!selectedCharacter) return null;
    return (
      <div className="mt-6">
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
    <div className="bg-characters-dark-blue rounded-xl shadow-lg p-6 md:p-8">
      <ViewHeader title={translatedCharacterType}>
        {!selectedCharacter && (
          <div className="flex items-center gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-8 mt-6 justify-items-center">
            {renderGallery()}
        </div>
      )}
    </div>
  );
};

export default CharacterView;