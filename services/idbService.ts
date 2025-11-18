
// services/idbService.ts

const DB_NAME = 'ElvariumDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function setImage(key: string, blob: Blob): Promise<void> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, key);

    transaction.oncomplete = () => resolve();
    
    transaction.onerror = () => {
      console.error('Error saving to IndexedDB:', transaction.error);
      reject(transaction.error);
    };
    
    request.onerror = () => {
       console.error('Request error saving to IndexedDB:', request.error);
    };
  });
}

export async function setImagesBulk(images: Record<string, Blob>): Promise<void> {
  const dbInstance = await getDB();
  const entries = Object.entries(images);
  const BATCH_SIZE = 5; 

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      
      await new Promise<void>((resolve, reject) => {
          const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);

          batch.forEach(([key, blob]) => {
              store.put(blob, key);
          });

          transaction.oncomplete = () => resolve();
          
          transaction.onerror = () => {
            console.error('Bulk save failed for batch:', transaction.error);
            reject(transaction.error);
          };
      });
  }
}

export async function getImage(key: string): Promise<Blob | null> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? (request.result as Blob) : null);
    };
    request.onerror = () => {
      console.error('Error getting from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

export async function checkImageExists(key: string): Promise<boolean> {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count(key);
  
      request.onsuccess = () => {
        resolve((request.result as number) > 0);
      };
      request.onerror = () => {
        resolve(false);
      };
    });
}

// Helper to optimize images for export - RELAXED to respect user wish for no reduction
async function optimizeBlobToDataUrl(blob: Blob): Promise<string> {
    // Return original if small enough
    if (blob.size < 100 * 1024) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Even if optimization is requested, we keep dimensions high and focus on WebP efficiency only.
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            
            // Reset to high quality threshold (1280px) to match storage, 
            // ensuring we don't aggressively downscale if this is ever called.
            const MAX_SIZE = 1280; 
            
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                 reject(new Error("Canvas context not available"));
                 return;
            }
            
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Use high quality WebP to ensure transparency and visual fidelity
            resolve(canvas.toDataURL('image/webp', 0.9));
        };
        img.onerror = (e) => {
             URL.revokeObjectURL(url);
             reject(e);
        }
    });
}

export async function getAllImagesAsDataUrls(
    optimize: boolean = false, 
    onProgress?: (current: number, total: number) => void
): Promise<Record<string, string>> {
    const dbInstance = await getDB();
    const results: Record<string, string> = {};

    // Phase 1: Retrieve all keys first.
    const keys = await new Promise<string[]>((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });

    // Phase 2: Batch Parallel Execution
    // Increased batch size to 50 for speed, modern browsers handle this well.
    const BATCH_SIZE = 50; 
    let completed = 0;
    const total = keys.length;

    if (onProgress) onProgress(0, total);
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batchKeys = keys.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batchKeys.map(async (key) => {
            try {
                const blob = await getImage(key);
                if (blob) {
                    // Use optimization only if explicitly requested, otherwise standard base64 conversion
                    if (optimize) {
                        results[key] = await optimizeBlobToDataUrl(blob);
                    } else {
                        const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = () => reject(new Error(`FileReader error for key ${key}`));
                            reader.readAsDataURL(blob);
                        });
                        results[key] = base64;
                    }
                }
            } catch (e) {
                console.warn(`Failed to export image ${key}:`, e);
            }
        }));
        
        completed += batchKeys.length;
        if (onProgress) onProgress(Math.min(completed, total), total);

        // Yield less frequently (every 4 batches = 200 items) to reduce event loop overhead
        if (i % (BATCH_SIZE * 4) === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }

    return results;
}

export async function clearImages(): Promise<void> {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        transaction.oncomplete = () => resolve();
        
        transaction.onerror = () => {
            console.error('Error clearing IndexedDB store:', transaction.error);
            reject(transaction.error);
        };
    });
}

export function closeConnection(): void {
    if (db) {
        db.close();
        db = null;
    }
}
