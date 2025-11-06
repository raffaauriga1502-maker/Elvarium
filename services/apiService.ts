
import { User, Character, CharacterType } from '../types';
import * as idbService from './idbService';

// --- Generic Local Storage Helpers ---
const getItem = <T>(key: string): Promise<T | null> => {
    try {
        const item = localStorage.getItem(key);
        return Promise.resolve(item ? JSON.parse(item) : null);
    } catch (error) {
        console.error(`Error getting item ${key} from localStorage`, error);
        return Promise.resolve(null);
    }
};

const setItem = <T>(key: string, value: T): Promise<void> => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting item ${key} in localStorage`, error);
        throw error;
    }
    return Promise.resolve();
};

const removeItem = (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
};


// --- User Management ---
const USERS_KEY = 'elvarium_users';
const CURRENT_USER_KEY = 'elvarium_current_user';

export const getUsers = (): Promise<User[]> => getItem<User[]>(USERS_KEY).then(users => users || []);
export const saveUsers = (users: User[]): Promise<void> => setItem(USERS_KEY, users);

export const getCurrentUser = (): Promise<User | null> => getItem<User>(CURRENT_USER_KEY);
export const saveCurrentUser = (user: User): Promise<void> => setItem(CURRENT_USER_KEY, user);
export const removeCurrentUser = (): Promise<void> => removeItem(CURRENT_USER_KEY);


// --- Image Utility ---
const imageFileToBlob = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('File is not an image.'));

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) return reject(new Error('FileReader did not load file.'));
            
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                
                ctx.drawImage(img, 0, 0, width, height);

                // Check file type to preserve transparency for PNGs
                const outputMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, outputMimeType, quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const processAndStoreImage = async (file: File, options: { maxWidth: number; maxHeight: number; quality?: number }): Promise<string> => {
    const blob = await imageFileToBlob(file, options.maxWidth, options.maxHeight, options.quality);
    const key = `idb://${crypto.randomUUID()}`;
    await idbService.setImage(key, blob);
    return key;
};

// A cache to avoid creating multiple object URLs for the same blob
const urlCache = new Map<string, string>();

export const resolveImageUrl = async (key: string | null | undefined): Promise<string | null> => {
    if (!key) return null;
    if (urlCache.has(key)) return urlCache.get(key)!;

    if (key.startsWith('idb://')) {
        const blob = await idbService.getImage(key);
        if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            urlCache.set(key, objectUrl);
            return objectUrl;
        }
    }
    // For backwards compatibility with old base64 strings
    if (key.startsWith('data:image/')) {
        return key;
    }
    return null;
};

// --- Customization ---
const LOGO_KEY = 'elvarium_logo';
const AUTH_BANNER_KEY = 'elvarium_auth_banner';

export const getLogo = (): Promise<string | null> => getItem<string>(LOGO_KEY);
export const saveLogo = (key: string): Promise<void> => setItem(LOGO_KEY, key);

export const getAuthBanner = (): Promise<string | null> => getItem<string>(AUTH_BANNER_KEY);
export const saveAuthBanner = (key: string): Promise<void> => setItem(AUTH_BANNER_KEY, key);

// --- Synopsis ---
const SYNOPSIS_KEY = 'elvarium_synopsis';
const SYNOPSIS_BANNER_KEY = 'elvarium_synopsis_banner';

export const getSynopsis = (): Promise<string | null> => getItem<string>(SYNOPSIS_KEY);
export const saveSynopsis = (synopsis: string): Promise<void> => setItem(SYNOPSIS_KEY, synopsis);

export const getSynopsisBanner = (): Promise<string | null> => getItem<string>(SYNOPSIS_BANNER_KEY);
export const saveSynopsisBanner = (key: string): Promise<void> => setItem(SYNOPSIS_BANNER_KEY, key);

// --- Characters ---
const getCharacterKey = (characterType: CharacterType) => `elvarium_characters_${characterType.replace(/\s+/g, '_')}`;

export const getCharacters = (characterType: CharacterType): Promise<Character[] | null> => {
    return getItem<Character[]>(getCharacterKey(characterType));
};

export const saveCharacters = (characterType: CharacterType, characters: Character[]): Promise<void> => {
    return setItem(getCharacterKey(characterType), characters);
};

// This function is deprecated and will be removed. Use processAndStoreImage.
export const imageFileToBase64 = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        imageFileToBlob(file, maxWidth, maxHeight, quality).then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }).catch(reject);
    });
};
