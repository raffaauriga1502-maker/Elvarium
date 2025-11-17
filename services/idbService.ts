
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

export async function getAllImagesAsDataUrls(): Promise<Record<string, string>> {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();
        const promises: Promise<void>[] = [];
        const results: Record<string, string> = {};

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const p = new Promise<void>((resolveRead, rejectRead) => {
                    const blob = cursor.value as Blob;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (e.target?.result) {
                            results[cursor.key as string] = e.target.result as string;
                            resolveRead();
                        } else {
                            rejectRead(new Error(`FileReader failed for key ${cursor.key}`));
                        }
                    };
                    reader.onerror = () => rejectRead(reader.error);
                    reader.readAsDataURL(blob);
                });
                promises.push(p);
                cursor.continue();
            }
        };

        transaction.oncomplete = () => {
            Promise.all(promises).then(() => {
                resolve(results);
            }).catch(reject);
        };
        
        transaction.onerror = () => reject(transaction.error);
    });
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
