
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
    'elvarium_home_bg',
    'elvarium_characters_bg',
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
const imageFileToBlob = (file: File, maxWidth: number = 2048, maxHeight: number = 2048, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('File is not an image.'));

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) return reject(new Error('FileReader did not load file.'));
            
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                // Optimization: If the image is already within bounds, do not use canvas to resize/recompress.
                // This preserves the original file quality, format (including transparency/animations), and metadata.
                if (img.width <= maxWidth && img.height <= maxHeight) {
                    resolve(file);
                    return;
                }

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
                
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // For file types that support transparency, convert to PNG. Otherwise, use JPEG.
                const transparentMimeTypes = ['image/png', 'image/gif', 'image/webp'];
                const outputMimeType = transparentMimeTypes.includes(file.type) ? 'image/png' : 'image/jpeg';
                
                if (outputMimeType === 'image/png') {
                     canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion for PNG failed'));
                        }
                    }, 'image/png');
                } else { // It's a JPEG
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    }, 'image/jpeg', quality);
                }
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
const HOME_BG_KEY = 'elvarium_home_bg';
const CHARACTERS_BG_KEY = 'elvarium_characters_bg';

export const getLogo = (): Promise<string | null> => getItem<string>(LOGO_KEY);
export const saveLogo = (key: string): Promise<void> => setItem(LOGO_KEY, key);

export const getAuthBanner = (): Promise<string | null> => getItem<string>(AUTH_BANNER_KEY);
export const saveAuthBanner = (key: string): Promise<void> => setItem(AUTH_BANNER_KEY, key);

export const getHomeBackground = (): Promise<string | null> => getItem<string>(HOME_BG_KEY);
export const saveHomeBackground = (key: string): Promise<void> => setItem(HOME_BG_KEY, key);

export const getCharactersBackground = (): Promise<string | null> => getItem<string>(CHARACTERS_BG_KEY);
export const saveCharactersBackground = (key: string): Promise<void> => setItem(CHARACTERS_BG_KEY, key);

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

export const removeCharacters = (characterType: CharacterType): Promise<void> => {
    return removeItem(getCharacterKey(characterType));
};

export const getAllCharactersBasicInfo = async (): Promise<{id: string, name: string, type: CharacterType}[]> => {
    const types: CharacterType[] = ['Main Protagonist', 'Allies', 'Main Antagonist', 'Enemies'];
    let all: {id: string, name: string, type: CharacterType}[] = [];
    for (const t of types) {
        const chars = await getCharacters(t);
        if (chars) {
            all = [...all, ...chars.map(c => ({id: c.id, name: c.name, type: t}))];
        }
    }
    return all.sort((a, b) => a.name.localeCompare(b.name));
};


export const getAllArcs = async (): Promise<string[]> => {
    const allArcs = new Set<string>();
    // Use old full list to ensure all data is scanned, even before migration
    const characterTypes: CharacterType[] = ['Main Protagonist', 'Allies', 'Main Antagonist', 'Enemies']; 

    for (const type of characterTypes) {
        const characters = await getCharacters(type);
        if (characters) {
            for (const char of characters) {
                // New structure
                if (char.portraits) {
                    char.portraits.forEach(p => {
                        p.outfits.forEach(o => allArcs.add(o.arcName));
                    });
                }
                if (char.arcs) {
                    char.arcs.forEach(arc => allArcs.add(arc));
                }
                
                // Legacy structures for migration-proofing
                const legacyChar = char as any;
                if (legacyChar.outfits) { // Old outfit structure
                    legacyChar.outfits.forEach((o: any) => o.arcName && allArcs.add(o.arcName));
                }
                if (legacyChar.appearances) { // Even older "appearance" structure
                    legacyChar.appearances.forEach((a: any) => a.arcName && allArcs.add(a.arcName));
                }
            }
        }
    }
    return Array.from(allArcs).filter(Boolean).sort(); // filter out empty strings
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
    
    // Import IndexedDB data using Bulk Operation
    const imagesToSave: Record<string, Blob> = {};
    if (data.indexedDB) {
        for (const key in data.indexedDB) {
            if (Object.prototype.hasOwnProperty.call(data.indexedDB, key)) {
                try {
                    const dataUrl = data.indexedDB[key];
                    // Basic validation
                    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                         const blob = dataUrlToBlob(dataUrl);
                         imagesToSave[key] = blob;
                    }
                } catch (e) {
                    console.warn(`Skipping invalid image data for key ${key}`, e);
                }
            }
        }
    }
    
    if (Object.keys(imagesToSave).length > 0) {
        await idbService.setImagesBulk(imagesToSave);
    }

    // Crucial: Explicitly close the database connection to force a flush to disk
    // before any page reload occurs.
    idbService.closeConnection();
};

// --- Compression Helpers ---
// Add safe checks for compression streams for older browsers (iOS < 16.4, etc)

function isCompressionSupported() {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

async function compressData(jsonString: string): Promise<Uint8Array> {
    if (!isCompressionSupported()) {
        // Fallback: Just return string bytes (dumb fallback, but prevents crash)
        // In reality, you'd use a JS library like pako, but for this no-dependency setup:
        const encoder = new TextEncoder();
        return encoder.encode(jsonString);
    }

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

async function decompressData(compressed: Uint8Array): Promise<string> {
    if (!isCompressionSupported()) {
        // Fallback assumption: It wasn't compressed or we can't decompress
        const decoder = new TextDecoder();
        return decoder.decode(compressed);
    }

    const stream = new Blob([compressed]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const reader = new Response(decompressedStream).body!.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);
    return blob.text();
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

// --- Sharing Logic ---

export type ShareSource = 'dpaste' | 'fileio' | 'dpaste-chunked';

function chunkString(str: string, length: number): string[] {
  return str.match(new RegExp('.{1,' + length + '}', 'g')) || [];
}

// Helper to process promises in batches to avoid network congestion
async function processInBatches<T, R>(items: T[], batchSize: number, processItem: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processItem));
        results.push(...batchResults);
    }
    return results;
}

export const fetchSharedWorldData = async (idOrIds: string, source: ShareSource = 'dpaste'): Promise<any> => {
    try {
        let textData = '';

        if (source === 'fileio') {
            // Fetch from file.io using the key
            const response = await fetch(`https://file.io/${idOrIds}`);
             if (!response.ok) {
                 if (response.status === 404) {
                      throw new Error("The shared file has been deleted or already downloaded. File.io links are valid for 1 download only.");
                 }
                throw new Error(`Could not fetch shared world data from file.io. Status: ${response.statusText}`);
            }
            textData = await response.text();
        } else if (source === 'dpaste-chunked') {
            const ids = idOrIds.split(',');
            console.log(`Fetching ${ids.length} chunks from dpaste...`);
            
            // Process downloads in batches of 5 to avoid browser limits
            const chunks = await processInBatches(ids, 5, async (id) => {
                 const response = await fetch(`https://dpaste.com/${id}.txt`);
                 if (!response.ok) throw new Error(`Failed to fetch chunk ${id}`);
                 return response.text();
            });
            
            textData = chunks.join('');
            
        } else {
            // Default to dpaste (single)
            const response = await fetch(`https://dpaste.com/${idOrIds}.txt`);
            if (!response.ok) {
                throw new Error(`Could not fetch shared world data. Status: ${response.statusText}`);
            }
            textData = await response.text();
        }
        
        try {
            const parsed = JSON.parse(textData);
            // Check if this is our compressed format
            if (parsed && parsed.compressed && parsed.data) {
                console.log("Detected compressed shared data. Decompressing...");
                const compressedBytes = base64ToUint8Array(parsed.data);
                const decompressedJson = await decompressData(compressedBytes);
                return JSON.parse(decompressedJson);
            }
            // Fallback for legacy uncompressed shares
            return parsed;
        } catch (jsonError) {
            console.error("Error parsing shared data JSON:", jsonError);
            throw new Error("Shared data is invalid or corrupted.");
        }

    } catch (error: any) {
        console.error("Failed to fetch shared world data:", error);
        throw new Error(error.message || "The shared world data could not be retrieved. The link may have expired or the sharing service is unavailable.");
    }
};

const uploadToFileIo = async (payloadString: string): Promise<string> => {
     // File.io expects a file upload. We create a Blob and append it.
     const blob = new Blob([payloadString], { type: 'application/json' });
     const formData = new FormData();
     formData.append('file', blob, 'elvarium_world.json');
     
     const response = await fetch('https://file.io/', {
         method: 'POST',
         body: formData
     });
     
     if (!response.ok) throw new Error(`File.io upload failed: ${response.statusText}`);
     const json = await response.json();
     if (!json.success) throw new Error('File.io reported failure');
     
     return json.key;
}

const uploadToDpaste = async (content: string): Promise<string> => {
    const formData = new URLSearchParams();
    formData.append('content', content);
    formData.append('expiry_days', '7'); // Keep for 7 days
    formData.append('syntax', 'json');
    formData.append('title', 'Elvarium Shared World Chunk');
    
    const response = await fetch('https://dpaste.com/api/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    });

    if (response.ok) {
        const pasteUrl = await response.text();
        const id = pasteUrl.split('/').pop();
        if (id) return id.trim();
    }
    throw new Error("Failed to upload to dpaste");
}

// Retry wrapper for robustness
const uploadToDpasteWithRetry = async (content: string, retries = 3): Promise<string> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await uploadToDpaste(content);
        } catch (e) {
            if (i === retries - 1) throw e;
            // Wait 500ms before retry
            await new Promise(r => setTimeout(r, 500));
        }
    }
    throw new Error("Unreachable");
}


export const generateShareableLink = async (): Promise<{url: string, warning?: string}> => {
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
    
    const rawJsonString = JSON.stringify(dataToShare);
    
    // Check if compression is available
    if (!isCompressionSupported()) {
        // For older browsers, we can only share small worlds that fit in a single paste
        const payloadObject = { compressed: false, data: btoa(rawJsonString) }; // Simple base64
        const payloadString = JSON.stringify(payloadObject);
         try {
            const pasteId = await uploadToDpasteWithRetry(payloadString);
             const baseUrl = window.location.origin + window.location.pathname;
            return { url: `${baseUrl}#id=${pasteId}`, warning: "Compression not supported on this browser. Only small worlds can be shared." };
        } catch (e: any) {
            throw new Error("Browser too old for compression, and data too large for uncompressed share.");
        }
    }
    
    // Compress the data to fit more content
    const compressedBytes = await compressData(rawJsonString);
    const base64Compressed = uint8ArrayToBase64(compressedBytes);
    
    // Create a wrapper object to identify the compression
    const payloadObject = {
        compressed: true,
        data: base64Compressed
    };
    
    const payloadString = JSON.stringify(payloadObject);
    const sizeInBytes = new Blob([payloadString]).size;
    
    console.log(`Payload size: ${(sizeInBytes / 1024).toFixed(2)} KB`);

    const baseUrl = window.location.origin + window.location.pathname;
    const url = new URL(baseUrl);
    url.search = '';

    // Strategy: 
    // 1. Size < 900KB: Single dpaste.
    // 2. Size < ~180MB: Chunked dpaste (multi-download).
    // 3. Size > ~180MB: file.io (single download) as absolute last resort.

    const SINGLE_PASTE_LIMIT = 900 * 1024; // 900KB safety buffer
    const MAX_CHUNKS = 200; // ~180MB limit for chunking strategy (Very generous)

    // 1. Small Payload
    if (sizeInBytes < SINGLE_PASTE_LIMIT) {
        try {
            const pasteId = await uploadToDpasteWithRetry(payloadString);
            url.hash = `#id=${pasteId}`;
            return { url: url.href };
        } catch (e) {
            console.warn("dpaste single failed, falling back to chunks", e);
        }
    }

    // 2. Medium to Large Payload (Chunked)
    if (sizeInBytes < SINGLE_PASTE_LIMIT * MAX_CHUNKS) {
        try {
            console.log("Payload too large for single paste, attempting chunking...");
            const chunks = chunkString(payloadString, SINGLE_PASTE_LIMIT); 
            
            // Upload chunks in batches of 5 to avoid rate limits/network congestion
            const ids = await processInBatches(chunks, 5, async (chunk) => {
                // Add a small delay to be polite to the API
                await new Promise(r => setTimeout(r, 100));
                return await uploadToDpasteWithRetry(chunk);
            });
            
            url.hash = `#chunks=${ids.join(',')}`;
            return { url: url.href };
        } catch (e) {
             console.warn("Chunking failed, falling back to file.io", e);
        }
    }

    // 3. Massive Payload (Fallback)
    try {
        const pasteId = await uploadToFileIo(payloadString);
        url.hash = `#fio=${pasteId}`;
        return { 
            url: url.href, 
            warning: "Note: Because this world is extremely large (>180MB), we had to use a file host. This link is valid for ONE download only." 
        };
    } catch (error: any) {
        console.error("All sharing services failed:", error);
        throw new Error("Could not create a shareable link. The data is too large even for the fallback service. Please use 'Download File'.");
    }
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
