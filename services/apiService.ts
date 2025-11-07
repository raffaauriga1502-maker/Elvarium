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

const APP_KEYS = [
    'elvarium_users',
    'elvarium_current_user',
    'elvarium_logo',
    'elvarium_auth_banner',
    'elvarium_synopsis',
    'elvarium_synopsis_banner',
    'elvarium_characters_Main_Protagonist',
    'elvarium_characters_Allies',
    'elvarium_characters_Main_Antagonist',
    'elvarium_characters_Enemies',
];

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

// --- Export / Import / Share ---

const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) throw new Error("Could not determine mime type");
    const mimeType = mimeMatch[1];
    const b64 = atob(parts[1]);
    let n = b64.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = b64.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mimeType});
}

export const exportAllData = async (includeImages = true): Promise<object> => {
    const localStorageData: { [key: string]: any } = {};
    for (const key of APP_KEYS) {
        const data = await getItem(key);
        if (data !== null) {
            localStorageData[key] = data;
        }
    }

    if (!includeImages) {
        return {
            localStorage: localStorageData,
        };
    }

    const indexedDBData = await idbService.getAllImagesAsDataUrls();
    
    return {
        localStorage: localStorageData,
        indexedDB: indexedDBData,
    };
};

export const importAllData = async (data: any): Promise<void> => {
    if (!data || !data.localStorage) {
        throw new Error("Invalid import file format.");
    }

    // Clear existing data
    for (const key of APP_KEYS) {
        await removeItem(key);
    }
    await idbService.clearImages();
    urlCache.clear();

    // Import localStorage data
    for (const key in data.localStorage) {
        if (Object.prototype.hasOwnProperty.call(data.localStorage, key)) {
            await setItem(key, data.localStorage[key]);
        }
    }
    
    // Import IndexedDB data if it exists
    if (data.indexedDB) {
        for (const key in data.indexedDB) {
            if (Object.prototype.hasOwnProperty.call(data.indexedDB, key)) {
                const dataUrl = data.indexedDB[key];
                const blob = dataUrlToBlob(dataUrl);
                await idbService.setImage(key, blob);
            }
        }
    }
};

// --- Compression & Sharing Logic ---
async function compressData(jsonString: string): Promise<Uint8Array> {
    const stream = new Blob([jsonString]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const reader = compressedStream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const generateShareableLink = async (): Promise<string> => {
    // Manually build the data object to ensure user data is excluded and image data is included.
    const SHAREABLE_LOCAL_STORAGE_KEYS = APP_KEYS.filter(
        key => key !== 'elvarium_users' && key !== 'elvarium_current_user'
    );
    
    const localStorageData: { [key: string]: any } = {};
    for (const key of SHAREABLE_LOCAL_STORAGE_KEYS) {
        const data = await getItem(key);
        if (data !== null) {
            localStorageData[key] = data;
        }
    }
    
    const indexedDBData = await idbService.getAllImagesAsDataUrls();
    
    const dataToShare = {
        localStorage: localStorageData,
        indexedDB: indexedDBData,
    };

    const jsonString = JSON.stringify(dataToShare);
    
    const compressedBytes = await compressData(jsonString);
    const base64String = uint8ArrayToBase64(compressedBytes);
    const urlSafeBase64 = base64String.replace(/\+/g, '-').replace(/\//g, '_');

    // Use window.location to construct the base URL. This is more reliable than
    // document.baseURI, especially when the app is running in an iframe.
    const baseUrl = window.location.origin + window.location.pathname;
    
    const url = new URL(baseUrl);
    
    // Clear any existing query params or hash from the base URL.
    url.search = '';
    url.hash = `#cdata=${urlSafeBase64}`;

    return url.href;
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