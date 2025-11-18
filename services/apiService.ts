
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
const imageFileToBlob = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('File is not an image.'));

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) return reject(new Error('FileReader did not load file.'));
            
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                // Enforce strict resizing even if file is small but dimensions are huge, to save canvas memory.
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
                
                const transparentMimeTypes = ['image/png', 'image/gif', 'image/webp'];
                // Force JPEG for large images unless transparency is likely needed, to save space.
                const outputMimeType = (transparentMimeTypes.includes(file.type) && file.size < 2 * 1024 * 1024) ? 'image/png' : 'image/jpeg';
                
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
    // Enforce a hard cap of 1920px to be safe for sharing, regardless of requested options
    const safeMaxWidth = Math.min(options.maxWidth, 1920);
    const safeMaxHeight = Math.min(options.maxHeight, 1920);
    
    const blob = await imageFileToBlob(file, safeMaxWidth, safeMaxHeight, options.quality);
    const key = `idb://${crypto.randomUUID()}`;
    await idbService.setImage(key, blob);
    return key;
};

// A cache to avoid creating multiple object URLs for the same blob
const urlCache = new Map<string, string>();

export const resolveImageUrl = async (key: string | null | undefined, retry = true): Promise<string | null> => {
    if (!key) return null;
    if (urlCache.has(key)) return urlCache.get(key)!;

    if (key.startsWith('idb://')) {
        try {
            let blob = await idbService.getImage(key);
            
            // Aggressive Retry: IDB might be slow on cold boot or after heavy write.
            if (!blob && retry) {
                const delays = [200, 500, 1000, 2000, 3000];
                for (const delay of delays) {
                    await new Promise(r => setTimeout(r, delay));
                    blob = await idbService.getImage(key);
                    if (blob) break;
                }
            }

            if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                urlCache.set(key, objectUrl);
                return objectUrl;
            } else {
                console.warn(`Image blob not found for key: ${key} after multiple retries`);
            }
        } catch (e) {
            console.warn(`Failed to resolve image for key ${key}`, e);
            return null;
        }
    }
    // For backwards compatibility with old base64 strings
    if (key.startsWith('data:image/')) {
        return key;
    }
    return null;
};

export const verifyImageExists = async (key: string): Promise<boolean> => {
    if (key.startsWith('idb://')) {
        return await idbService.checkImageExists(key);
    }
    return true; 
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
    const characterTypes: CharacterType[] = ['Main Protagonist', 'Allies', 'Main Antagonist', 'Enemies']; 

    for (const type of characterTypes) {
        const characters = await getCharacters(type);
        if (characters) {
            for (const char of characters) {
                if (char.portraits) {
                    char.portraits.forEach(p => {
                        p.outfits.forEach(o => allArcs.add(o.arcName));
                    });
                }
                if (char.arcs) {
                    char.arcs.forEach(arc => allArcs.add(arc));
                }
                const legacyChar = char as any;
                if (legacyChar.outfits) {
                    legacyChar.outfits.forEach((o: any) => o.arcName && allArcs.add(o.arcName));
                }
                if (legacyChar.appearances) {
                    legacyChar.appearances.forEach((a: any) => a.arcName && allArcs.add(a.arcName));
                }
            }
        }
    }
    return Array.from(allArcs).filter(Boolean).sort();
};


// --- Export / Import / Share ---

const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
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
    } catch (e) {
        console.error("Error converting DataURL to Blob:", e);
        throw e;
    }
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
    
    // Import IndexedDB data using Memory-Safe Streaming Batch
    if (data.indexedDB) {
        const keys = Object.keys(data.indexedDB);
        const BATCH_SIZE = 5; 
        
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            const batchKeys = keys.slice(i, i + BATCH_SIZE);
            const batchImages: Record<string, Blob> = {};
            
            for (const key of batchKeys) {
                try {
                    const dataUrl = data.indexedDB[key];
                    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                        const blob = dataUrlToBlob(dataUrl);
                        batchImages[key] = blob;
                    }
                } catch (e) {
                    console.warn(`Skipping invalid image data for key ${key}`, e);
                }
            }
            
            if (Object.keys(batchImages).length > 0) {
                await idbService.setImagesBulk(batchImages);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    idbService.closeConnection();
};

// --- Compression Helpers ---

function isCompressionSupported() {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

async function compressData(jsonString: string): Promise<Uint8Array> {
    if (!isCompressionSupported()) {
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
    const size = str.length;
    const numChunks = Math.ceil(size / length);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += length) {
        chunks[i] = str.substring(o, o + length);
    }
    return chunks;
}

// Increased timeout to 3 minutes to handle large files on slow mobile connections
const UPLOAD_TIMEOUT = 180000; 

// Helper: Fetch with timeout
async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function processInBatches<T, R>(items: T[], batchSize: number, processItem: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processItem));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return results;
}

export const fetchSharedWorldData = async (idOrIds: string, source: ShareSource = 'dpaste'): Promise<any> => {
    try {
        let textData = '';

        if (source === 'fileio') {
            const response = await fetchWithTimeout(`https://file.io/${idOrIds}`, {}, UPLOAD_TIMEOUT);
             if (!response.ok) {
                 if (response.status === 404) {
                      throw new Error("The shared file has been deleted or already downloaded. File.io links are valid for 1 download only.");
                 }
                throw new Error(`Could not fetch shared world data from file.io. Status: ${response.statusText}`);
            }
            textData = await response.text();
        } else if (source === 'dpaste-chunked') {
            const ids = idOrIds.split(',');
            const chunks = await processInBatches(ids, 3, async (id) => {
                 const response = await fetchWithTimeout(`https://dpaste.com/${id}.txt`);
                 if (!response.ok) throw new Error(`Failed to fetch chunk ${id}`);
                 return response.text();
            });
            textData = chunks.join('');
        } else {
            const response = await fetchWithTimeout(`https://dpaste.com/${idOrIds}.txt`);
            if (!response.ok) {
                throw new Error(`Could not fetch shared world data. Status: ${response.statusText}`);
            }
            textData = await response.text();
        }
        
        try {
            const parsed = JSON.parse(textData);
            if (parsed && parsed.compressed && parsed.data) {
                const compressedBytes = base64ToUint8Array(parsed.data);
                const decompressedJson = await decompressData(compressedBytes);
                return JSON.parse(decompressedJson);
            }
            return parsed;
        } catch (jsonError) {
            console.error("Error parsing shared data JSON:", jsonError);
            throw new Error("Shared data is invalid or corrupted.");
        }

    } catch (error: any) {
        console.error("Failed to fetch shared world data:", error);
        throw new Error(error.message || "The shared world data could not be retrieved.");
    }
};

const uploadToFileIo = async (payloadString: string): Promise<string> => {
     // Use text/plain to avoid strict JSON validation issues on file.io side sometimes
     const blob = new Blob([payloadString], { type: 'text/plain' });
     const formData = new FormData();
     formData.append('file', blob, 'elvarium_world.json');
     formData.append('expires', '1w'); // Explicitly request 1 week
     formData.append('maxDownloads', '1');
     formData.append('autoDelete', 'true');
     
     const response = await fetchWithTimeout('https://file.io/', {
         method: 'POST',
         body: formData
     }, UPLOAD_TIMEOUT); 
     
     if (!response.ok) {
         const errText = await response.text().catch(() => response.statusText);
         throw new Error(`File.io upload failed (${response.status}): ${errText}`);
     }
     const json = await response.json();
     if (!json.success) throw new Error('File.io reported failure: ' + (json.message || 'Unknown'));
     
     return json.key;
}

const uploadToDpaste = async (content: string): Promise<string> => {
    const formData = new URLSearchParams();
    formData.append('content', content);
    formData.append('expiry_days', '7');
    formData.append('syntax', 'json');
    formData.append('title', 'Elvarium Shared World Chunk');
    
    const response = await fetchWithTimeout('https://dpaste.com/api/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    }, UPLOAD_TIMEOUT);

    if (response.ok) {
        const pasteUrl = await response.text();
        const id = pasteUrl.split('/').pop();
        if (id) return id.trim();
    }
    throw new Error("Failed to upload to dpaste");
}

const uploadToDpasteWithRetry = async (content: string, retries = 3): Promise<string> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await uploadToDpaste(content);
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error("Unreachable");
}


export const generateShareableLink = async (onProgress?: (message: string) => void, forceNoCompression = false): Promise<{url: string, warning?: string}> => {
    const SHAREABLE_LOCAL_STORAGE_KEYS = APP_KEYS.filter(
        key => key !== 'elvarium_users' && key !== 'elvarium_current_user'
    );
    
    onProgress?.("Reading data...");
    const localStorageData: { [key: string]: any } = {};
    for (const key of SHAREABLE_LOCAL_STORAGE_KEYS) {
        const data = await getItem(key);
        if (data !== null) {
            localStorageData[key] = data;
        }
    }
    
    onProgress?.("Reading images (this may take a moment)...");
    const indexedDBData = await idbService.getAllImagesAsDataUrls();
    
    const dataToShare = {
        localStorage: localStorageData,
        indexedDB: indexedDBData,
    };
    
    const rawJsonString = JSON.stringify(dataToShare);
    
    // Handle No Compression (Safe Mode or Unsupported)
    if (forceNoCompression || !isCompressionSupported()) {
        onProgress?.("Uploading (Safe Mode - No Compression)...");
        
        const payloadString = rawJsonString; // Upload pure JSON text for maximum compatibility

        try {
             // Try dpaste first if small enough
             if (new Blob([payloadString]).size < 250 * 1024) {
                 try {
                    const pasteId = await uploadToDpasteWithRetry(payloadString);
                    const baseUrl = window.location.origin + window.location.pathname;
                    return { url: `${baseUrl}#id=${pasteId}` };
                 } catch (dpasteError) {
                     console.warn("Dpaste failed in safe mode, falling back to file.io", dpasteError);
                     // Fallthrough to file.io
                 }
             }
             
             // Go to file.io for reliability or if dpaste failed
             const pasteId = await uploadToFileIo(payloadString);
             const baseUrl = window.location.origin + window.location.pathname;
             return { 
                 url: `${baseUrl}#fio=${pasteId}`, 
                 warning: "Safe Mode used. File is large. Link valid for ONE download only via file.io." 
             };
             
        } catch (e: any) {
            console.error("Safe mode upload failed", e);
            let msg = e.message || "Unknown error";
            if (msg.includes("Failed to fetch")) msg = "Network error or request blocked (Check connection/AdBlock)";
            throw new Error(`Upload failed: ${msg}. If this persists, use 'Download File'.`);
        }
    }
    
    onProgress?.("Compressing...");
    const compressedBytes = await compressData(rawJsonString);
    const base64Compressed = uint8ArrayToBase64(compressedBytes);
    
    const payloadObject = {
        compressed: true,
        data: base64Compressed
    };
    
    const payloadString = JSON.stringify(payloadObject);
    const sizeInBytes = new Blob([payloadString]).size;
    
    const baseUrl = window.location.origin + window.location.pathname;
    const url = new URL(baseUrl);
    url.search = '';

    const SINGLE_PASTE_LIMIT = 250 * 1024; 
    const MAX_CHUNKS = 200; 

    if (sizeInBytes < SINGLE_PASTE_LIMIT) {
        onProgress?.("Uploading...");
        try {
            const pasteId = await uploadToDpasteWithRetry(payloadString);
            url.hash = `#id=${pasteId}`;
            return { url: url.href };
        } catch (e) {
            console.warn("dpaste single failed, falling back to chunks", e);
        }
    }

    if (sizeInBytes < SINGLE_PASTE_LIMIT * MAX_CHUNKS) {
        try {
            const chunks = chunkString(payloadString, SINGLE_PASTE_LIMIT); 
            let uploadedCount = 0;
            const ids = await processInBatches(chunks, 1, async (chunk) => {
                await new Promise(r => setTimeout(r, 500));
                const res = await uploadToDpasteWithRetry(chunk);
                uploadedCount++;
                onProgress?.(`Uploading part ${uploadedCount}/${chunks.length}...`);
                return res;
            });
            
            url.hash = `#chunks=${ids.join(',')}`;
            return { url: url.href };
        } catch (e) {
             console.warn("Chunking failed, falling back to file.io", e);
        }
    }

    try {
        onProgress?.("Uploading large file...");
        const pasteId = await uploadToFileIo(payloadString);
        url.hash = `#fio=${pasteId}`;
        return { 
            url: url.href, 
            warning: "Large world file. Link valid for ONE download only via file.io." 
        };
    } catch (error: any) {
        console.error("All sharing services failed:", error);
        throw new Error(`Sharing failed: ${error.message}`);
    }
};


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
