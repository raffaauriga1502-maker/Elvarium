

export type CharacterType = 'Main Protagonist' | 'Allies' | 'Main Antagonist' | 'Enemies';

export type View =
  | { type: 'home' }
  | { type: 'profile' }
  | { type: 'characters'; subType: CharacterType };

export interface Outfit {
  id: string;
  arcName: string;
  imageUrl: string;
}

export interface GalleryImage {
  id: string;
  caption: string;
  imageUrl: string;
}

export interface User {
  username: string;
  password: string; // In a real app, this would be a hash
  role: 'admin' | 'viewer';
  avatarUrl?: string;
  bio?: string;
}

export interface Character {
  id:string;
  name: string;
  status: string;
  birthplace: string;
  age: string;
  height: string;
  weight: string;
  bloodType: string;

  about: string;
  biography: string;
  personality: string;
  appearanceDescription: string;
  powers: string;
  relationships: string;
  trivia: string;
  
  portraitImageUrl?: string;
  outfits: Outfit[];
  gallery: GalleryImage[];
  backgroundImageUrl?: string;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}