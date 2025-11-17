

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

export interface Portrait {
  id: string;
  name: string;
  imageUrl: string;
  outfits: Outfit[];
}

export interface GalleryImage {
  id: string;
  caption: string;
  imageUrl: string;
}

export interface Relationship {
  id: string;
  targetId: string | null; // null if it's a custom name not linked to a character card
  targetName: string;
  description: string;
}

export interface User {
  username: string;
  password: string; // In a real app, this would be a hash
  role: 'admin' | 'viewer';
  avatarUrl?: string;
  profileBackgroundUrl?: string;
  bio?: string;
}

export interface Character {
  id:string;
  name: string;
  alias: string;
  status: string;
  birthplace: string;
  age: string;
  height: string;
  weight: string;
  bloodType: string;
  isNpc?: boolean;

  about: string;
  biography: string;
  personality: string;
  appearanceDescription: string;
  powers: string;
  relationships: string; // Legacy / Notes
  relationshipLinks?: Relationship[]; // Structured links
  trivia: string;
  
  portraits: Portrait[];
  arcs: string[];
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