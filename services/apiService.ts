
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

// --- Character Management ---
export const getCharacters = (type: CharacterType): Promise<Character[]> => {
    // Legacy support: remap 'Main Antagonist' to a predictable key if needed, 
    // but primarily we store by type.
    // We need to ensure we don't lose old keys.
    const key = `elvarium_characters_${type.replace(/\s+/g, '_').toLowerCase()}`;
    return getItem<Character[]>(key).then(chars => chars || []);
};

export const saveCharacters = (type: CharacterType, characters: Character[]): Promise<void> => {
    const key = `elvarium_characters_${type.replace(/\s+/g, '_').toLowerCase()}`;
    return setItem(key, characters);
};

export const removeCharacters = (type: CharacterType): Promise<void> => {
    const key = `elvarium_characters_${type.replace(/\s+/g, '_').toLowerCase()}`;
    return removeItem(key);
};

export const getAllCharactersBasicInfo = async (): Promise<{id: string, name: string}[]> => {
    // Helper to scan all character lists for relationships
    const types: CharacterType[] = ['Main Protagonist', 'Allies', 'Enemies', 'Main Antagonist' as any];
    let allChars: {id: string, name: string}[] = [];
    for (const t of types) {
        const chars = await getCharacters(t);
        if (chars) {
            allChars = [...allChars, ...chars.map(c => ({ id: c.id, name: c.name }))];
        }
    }
    return allChars;
};

// --- Other Data ---
const SYNOPSIS_KEY = 'elvarium_synopsis';
export const getSynopsis = (): Promise<string> => getItem<string>(SYNOPSIS_KEY).then(s => s || '');
export const saveSynopsis = (synopsis: string): Promise<void> => setItem(SYNOPSIS_KEY, synopsis);

const LOGO_KEY = 'elvarium_logo_image';
export const getLogo = (): Promise<string | null> => getItem<string>(LOGO_KEY);
export const saveLogo = (key: string): Promise<void> => setItem(LOGO_KEY, key);

const AUTH_BANNER_KEY = 'elvarium_auth_banner';
export const getAuthBanner = (): Promise<string | null> => getItem<string>(AUTH_BANNER_KEY);
export const saveAuthBanner = (key: string): Promise<void> => setItem(AUTH_BANNER_KEY, key);

const HOME_BG_KEY = 'elvarium_home_bg';
export const getHomeBackground = (): Promise<string | null> => getItem<string>(HOME_BG_KEY);
export const saveHomeBackground = (key: string): Promise<void> => setItem(HOME_BG_KEY, key);

const CHARACTERS_BG_KEY = 'elvarium_characters_bg';
export const getCharactersBackground = (): Promise<string | null> => getItem<string>(CHARACTERS_BG_KEY);
export const saveCharactersBackground = (key: string): Promise<void> => setItem(CHARACTERS_BG_KEY, key);

const SYNOPSIS_BANNER_KEY = 'elvarium_synopsis_banner';
export const getSynopsisBanner = (): Promise<string | null> => getItem<string>(SYNOPSIS_BANNER_KEY);
export const saveSynopsisBanner = (key: string): Promise<void> => setItem(SYNOPSIS_BANNER_KEY, key);

// Helper to get all unique Arcs from characters
export const getAllArcs = async (): Promise<string[]> => {
    const types: CharacterType[] = ['Main Protagonist', 'Allies', 'Enemies'];
    const arcSet = new Set<string>();
    
    for (const type of types) {
        const chars = await getCharacters(type);
        chars.forEach(char => {
            if (char.arcs) {
                char.arcs.forEach(arc => arcSet.add(arc));
            }
        });
    }
    return Array.from(arcSet).sort();
};


// --- Image Utility ---
export const processAndStoreImage = async (file: File, options: { maxWidth: number; maxHeight: number; quality?: number }): Promise<string> => {
    // Enforce caps but allow for higher quality storage as requested
    const safeMaxWidth = Math.min(options.maxWidth, 1920);
    const safeMaxHeight = Math.min(options.maxHeight, 1920);
    
    const requestedQuality = options.quality !== undefined ? options.quality : 0.8;
    const safeQuality = Math.min(requestedQuality, 0.95);
    
    const blob = await new Promise<Blob>((resolve, reject) => {
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
                    if (width > safeMaxWidth) {
                        height = Math.round(height * (safeMaxWidth / width));
                        width = safeMaxWidth;
                    }
                } else {
                    if (height > safeMaxHeight) {
                        width = Math.round(width * (safeMaxHeight / height));
                        height = safeMaxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Detect if we should use WebP (for transparency support + compression)
                // or JPEG (for opaque images + compression)
                const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
                
                if (isTransparent) {
                    // Use WebP to preserve transparency while compressing
                    canvas.toBlob((b) => {
                        if (b) resolve(b);
                         // Fallback if WebP fails or results in null (unlikely in modern browsers)
                        else {
                             canvas.toBlob((b2) => {
                                if (b2) resolve(b2);
                                else reject(new Error('Canvas to Blob conversion failed (fallback)'));
                             }, 'image/png');
                        }
                    }, 'image/webp', safeQuality);
                } else {
                     // JPEG for everything else
                     canvas.toBlob((b) => {
                        if (b) resolve(b);
                        else reject(new Error('Canvas to Blob conversion failed'));
                    }, 'image/jpeg', safeQuality);
                }
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });

    const key = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await idbService.setImage(key, blob);
    return key;
};

export const resolveImageUrl = async (imageKey: string): Promise<string | null> => {
    if (!imageKey) return null;
    const blob = await idbService.getImage(imageKey);
    if (!blob) return null;
    return URL.createObjectURL(blob);
};

export const verifyImageExists = async (key: string): Promise<boolean> => {
    return idbService.checkImageExists(key);
};


// --- Import/Export ---

export interface BackupData {
    localStorage: Record<string, any>;
    images: Record<string, string>; // base64
}

// DYNAMIC EXPORT: Scans all keys to ensure nothing is missed
export const exportAllData = async (
    optimizeImagesForShare: boolean = false,
    onProgress?: (message: string) => void
): Promise<BackupData> => {
    const localStorageData: Record<string, any> = {};
    
    // 1. Dynamic Scan of LocalStorage
    if (onProgress) onProgress("Scanning settings...");
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Only grab keys that belong to this app
        if (key && key.startsWith('elvarium_')) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    localStorageData[key] = JSON.parse(raw);
                }
            } catch (e) {
                console.warn(`Skipping corrupted key ${key}`, e);
            }
        }
    }

    // 2. Get Images (with optional optimization)
    if (onProgress) onProgress("Preparing images...");
    // Small delay to let UI render "Preparing..."
    await new Promise(r => setTimeout(r, 50));
    
    const images = await idbService.getAllImagesAsDataUrls(optimizeImagesForShare, (current, total) => {
        if (onProgress) onProgress(`Encoding images: ${current}/${total}`);
    });

    return {
        localStorage: localStorageData,
        images,
    };
};

export const importAllData = async (data: BackupData): Promise<void> => {
    // Clear existing
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('elvarium_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // Restore LocalStorage
    Object.entries(data.localStorage).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    });

    // Restore Images
    await idbService.clearImages();
    
    const blobMap: Record<string, Blob> = {};
    
    // Process base64 back to Blobs in memory first
    for (const [key, base64] of Object.entries(data.images)) {
        try {
            const res = await fetch(base64);
            const blob = await res.blob();
            blobMap[key] = blob;
        } catch (e) {
            console.error(`Failed to convert image ${key} back to blob`, e);
        }
    }
    
    // Bulk save to IDB
    await idbService.setImagesBulk(blobMap);
};

// --- Sharing Logic ---

export type ShareSource = 'dpaste' | 'dpaste-chunked' | 'fileio';

export const generateShareableLink = async (
    onStatusUpdate?: (status: string) => void, 
    safeMode: boolean = false
): Promise<{ url: string; warning?: string }> => {
    if (onStatusUpdate) onStatusUpdate("Gathering data...");

    // CRITICAL CHANGE: Always pass FALSE for optimization.
    // The user explicitly requested "no reducing or lowering".
    // This preserves full transparency and original quality, 
    // and significantly speeds up the "Gathering/Processing" phase by skipping re-encoding.
    const data = await exportAllData(false, onStatusUpdate);
    
    if (onStatusUpdate) onStatusUpdate("Finalizing package...");
    // Delay to let the UI render the message before the heavy JSON.stringify freezes the thread
    await new Promise(r => setTimeout(r, 100));

    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const sizeMB = blob.size / (1024 * 1024);
    if (onStatusUpdate) onStatusUpdate(`Upload size: ${sizeMB.toFixed(2)} MB...`);
    
    // Allow status update to be visible
    await new Promise(r => setTimeout(r, 500));

    // BUMPED LIMIT: Mobile browsers often fail > 100MB on upload.
    // File.io free limit is decent, but browser reliability drops with massive blobs.
    if (sizeMB > 100) {
         throw new Error(`World size (${sizeMB.toFixed(2)} MB) is too large to upload reliably via link. Please use 'Download File' instead.`);
    }
    
    if (onStatusUpdate) onStatusUpdate(`Uploading ${sizeMB.toFixed(2)} MB...`);

    // STRATEGY 1: dpaste
    // User requested up to 100MB to attempt text share first
    // Note: dpaste may reject extremely large bodies, which will fall back to file.io
    if (sizeMB < 100) {
        try {
            const text = await blob.text();
            const formData = new FormData();
            formData.append('content', text);
            formData.append('expiry_days', '7');
            formData.append('syntax', 'json');
            formData.append('title', 'Elvarium World Data');

            // dpaste is very robust for small payloads
            const response = await fetch('https://dpaste.com/api/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const location = await response.text();
                // dpaste returns full URL (e.g., https://dpaste.com/ABCD123)
                const id = location.trim().split('/').filter(Boolean).pop();
                if (id) {
                    return { url: `${window.location.origin}${window.location.pathname}#id=${id}` };
                }
            }
        } catch (e) {
            console.warn("dpaste fallback failed, trying file.io...", e);
        }
    }

    // STRATEGY 2: file.io (For larger files, or if dpaste failed)
    // file.io handles binary blobs well but can be blocked by ad-blockers or firewalls
    try {
        const formData = new FormData();
        formData.append('file', blob, 'elvarium_world.json');
        
        // 1 week expiry
        const response = await fetch('https://file.io/?expires=1w', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
            const fileKey = result.key; // file.io key
            // Construct app link
            const shareUrl = `${window.location.origin}${window.location.pathname}#fio=${fileKey}`;
            return { 
                url: shareUrl,
                warning: "Note: This link expires after 1 download or 1 week."
            };
        } else {
            throw new Error('Upload service returned failure.');
        }
    } catch (error: any) {
        console.error("Share upload failed:", error);
        // Translate generic fetch errors to something more helpful for the user
        if (error.message.includes('Failed to fetch')) {
             if (sizeMB < 1) {
                 throw new Error("Upload failed. Your browser or network might be blocking the upload service (check AdBlock/Firewall).");
             }
             throw new Error("Upload failed. Your network connection may be unstable, or the file is too large for your current connection.");
        }
        throw new Error(`${error.message}`);
    }
};

// Fetch logic for the import modal
export const fetchSharedWorldData = async (id: string, source: ShareSource): Promise<BackupData> => {
    if (source === 'fileio') {
        const response = await fetch(`https://file.io/${id}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error("File not found or already deleted.");
            throw new Error("Failed to download shared file.");
        }
        return await response.json();
    } 
    
    // Legacy/Fallback dpaste logic (if used by older links or new small links)
    if (source === 'dpaste') {
         const response = await fetch(`https://dpaste.com/${id}.txt`);
         if (!response.ok) throw new Error("Failed to fetch from dpaste.");
         const text = await response.text();
         return JSON.parse(text);
    }

    throw new Error("Unknown share source.");
};
