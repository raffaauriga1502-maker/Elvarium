import React, { useState, useEffect } from 'react';
import { Character, CharacterType, Appearance, User } from '../types';
import CharacterCard from './CharacterCard';
import ViewHeader from './ViewHeader';
import CharacterAvatar from './CharacterAvatar';
import * as apiService from '../services/apiService';

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
  
  useEffect(() => {
    const loadCharacters = async () => {
      try {
          const savedCharacters = await apiService.getCharacters(characterType);
          
          if (savedCharacters) {
            const parsedCharacters: any[] = savedCharacters;
            
            const migratedCharacters = parsedCharacters.map(char => {
                let migrated: Partial<Character> = {};

                if (char.imageUrl && (!char.appearances || char.appearances.length === 0)) {
                    // Handle older `imageUrl` field, migrating it to `appearances`
                    migrated.appearances = [{ id: crypto.randomUUID(), arcName: 'Default', imageUrl: char.imageUrl }];
                } else if (!char.appearances) {
                    // Ensure appearances array always exists
                    migrated.appearances = [];
                }

                if (!char.gallery) {
                    // Add gallery array if it doesn't exist
                    migrated.gallery = [];
                }
                
                const finalChar: Character = {
                    ...char,
                    status: char.status || 'Alive',
                    about: char.about || '',
                    biography: char.biography || char.backgroundDescription || '',
                    personality: char.personality || '',
                    appearanceDescription: char.appearanceDescription || '',
                    powers: char.powers || '',
                    relationships: char.relationships || '',
                    trivia: char.trivia || '',
                    ...migrated,
                };
                
                // Clean up old properties
                delete (finalChar as any).backgroundDescription;
                delete (finalChar as any).imageUrl;

                return finalChar;
            });
            setCharacters(migratedCharacters);
          } else {
              setCharacters([]);
          }
      } catch (error) {
          console.error("Failed to parse characters from localStorage", error);
          setCharacters([]);
      }
      setSelectedCharacterIndex(null);
    };
    loadCharacters();
  }, [characterType]);

  const saveCharacters = async (updatedCharacters: Character[]) => {
      const oldCharacters = characters;
      setCharacters(updatedCharacters); // Optimistic update
      try {
        await apiService.saveCharacters(characterType, updatedCharacters);
      } catch(error) {
          console.error("Failed to save characters:", error);
          if (isQuotaExceededError(error)) {
              alert("Could not save changes. The application storage is full. Please remove some data (e.g., gallery images) and try again.");
          } else {
              alert("An unknown error occurred while saving. Your changes may not be persisted.");
          }
          setCharacters(oldCharacters); // Rollback
      }
  }
  
  const handleAddCharacter = () => {
    const newCharacter: Character = {
        id: crypto.randomUUID(),
        name: 'New Character',
        status: 'Alive',
        birthplace: 'Unknown',
        age: 'Unknown',
        height: 'Unknown',
        weight: 'Unknown',
        bloodType: 'Unknown',
        about: 'A brief summary of the character.',
        biography: 'The life story of the character.',
        personality: 'Details about their traits and behavior.',
        appearanceDescription: 'A textual description of how they look.',
        powers: 'Abilities and skills.',
        relationships: 'Connections to other characters.',
        trivia: 'Interesting facts and notes.',
        appearances: [{ id: crypto.randomUUID(), arcName: 'Default', imageUrl: '' }],
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
  };

  const selectedCharacter = selectedCharacterIndex !== null ? characters[selectedCharacterIndex] : null;

  const handleBackgroundImageUpload = (base64Url: string) => {
    if (selectedCharacterIndex === null) return;

    const updatedCharacters = characters.map((char, index) => {
        if (index === selectedCharacterIndex) {
            return { ...char, backgroundImageUrl: base64Url };
        }
        return char;
    });
    saveCharacters(updatedCharacters);
  };

  const handleCharacterUpdate = (updatedCharacter: Character) => {
    if (selectedCharacterIndex === null) return;
    const updatedCharacters = characters.map((char, index) => 
      index === selectedCharacterIndex ? updatedCharacter : char
    );
    saveCharacters(updatedCharacters);
  };

  const handleCharacterDelete = (id: string) => {
    if(window.confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
        const updatedCharacters = characters.filter(char => char.id !== id);
        saveCharacters(updatedCharacters);
        setSelectedCharacterIndex(null);
    }
  };
  
  const renderGallery = () => {
    if (characters.length === 0) {
        return <div className="col-span-full text-center text-text-secondary py-10">No characters created yet. {userRole === 'admin' && 'Click "Add Character" to begin.'}</div>
    }
    return characters.map((character, index) => (
      <CharacterAvatar 
        key={character.id} 
        character={character} 
        onClick={() => setSelectedCharacterIndex(index)}
      />
    ));
  };

  const renderDetailView = () => {
    if (!selectedCharacter) return null;
    return (
      <div className="mt-6">
        <button 
            onClick={() => setSelectedCharacterIndex(null)}
            className="mb-6 flex items-center gap-2 text-accent hover:text-sky-300 transition-colors font-semibold"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to {characterType}
        </button>
        <CharacterCard 
            character={selectedCharacter}
            onBackgroundUpload={handleBackgroundImageUpload}
            onUpdate={handleCharacterUpdate}
            onDelete={handleCharacterDelete}
            userRole={userRole}
        />
      </div>
    );
  };
  
  return (
    <div className="bg-characters-dark-blue rounded-xl shadow-lg p-6 md:p-8">
      <ViewHeader title={characterType}>
        {!selectedCharacter && userRole === 'admin' && (
            <button
                onClick={handleAddCharacter}
                className="bg-accent hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
                Add Character
            </button>
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
