
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

    // Critical: We must wait for transaction.oncomplete, not just request.onsuccess
    // to ensure data is actually flushed to disk before resolving.
    transaction.oncomplete = () => resolve();
    
    transaction.onerror = () => {
      console.error('Error saving to IndexedDB:', transaction.error);
      reject(transaction.error);
    };
    
    request.onerror = () => {
       // Fallback log if request fails before transaction
       console.error('Request error saving to IndexedDB:', request.error);
    };
  });
}

export async function setImagesBulk(images: Record<string, Blob>): Promise<void> {
  const dbInstance = await getDB();
  const entries = Object.entries(images);
  const BATCH_SIZE = 5; // Process in small batches to prevent transaction timeouts on mobile

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

export async function getAllImagesAsDataUrls(): Promise<Record<string, string>> {
    const dbInstance = await getDB();
    const results: Record<string, string> = {};

    // Phase 1: Retrieve all keys first.
    // This avoids keeping a cursor/transaction open while performing slow FileRead operations.
    const keys = await new Promise<string[]>((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });

    // Phase 2: Fetch and convert each image sequentially.
    // Serial execution ensures we don't run out of memory or crash the browser tab with too many active FileReaders.
    let count = 0;
    for (const key of keys) {
        // Yield to main thread every few images to prevent "Page Unresponsive" browser warnings on large sets
        if (count++ % 5 === 0) await new Promise(r => setTimeout(r, 0));

        try {
            // Re-open a transaction for each fetch or rely on helper
            const blob = await getImage(key);
            if (blob) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error(`FileReader error for key ${key}`));
                    reader.readAsDataURL(blob);
                });
                results[key] = base64;
            }
        } catch (e) {
            console.warn(`Failed to export image ${key}:`, e);
            // Skip erroneous images instead of failing the whole export
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
