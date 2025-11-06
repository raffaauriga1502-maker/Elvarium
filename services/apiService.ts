// FIX: Import CharacterType to resolve type errors.
import { User, Character, CharacterType } from '../types';

// Simulate network latency
const FAKE_LATENCY_MS = 500;

/**
 * A generic function to simulate an async request with latency.
 * @param operation The synchronous operation (e.g., localStorage access) to perform.
 * @returns A promise that resolves with the result of the operation.
 */
function request<T>(operation: () => T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(operation());
    }, FAKE_LATENCY_MS);
  });
}

/**
 * A helper for safely getting and parsing a JSON item from localStorage.
 * @param key The localStorage key.
 * @param defaultValue The value to return if the key doesn't exist or parsing fails.
 * @returns The parsed item or the default value.
 */
function getParsedItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        return defaultValue;
    }
}

// === API Methods ===

// -- Users --
export const getUsers = (): Promise<User[]> => {
    return request(() => getParsedItem<User[]>('elvarium-users', []));
};

export const saveUsers = (users: User[]): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-users', JSON.stringify(users)));
};

export const getCurrentUser = (): Promise<User | null> => {
    return request(() => getParsedItem<User | null>('elvarium-currentUser', null));
};

export const saveCurrentUser = (user: User): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-currentUser', JSON.stringify(user)));
};

export const removeCurrentUser = (): Promise<void> => {
    return request(() => localStorage.removeItem('elvarium-currentUser'));
};

// -- App Settings --
export const getLogo = (): Promise<string | null> => {
    return request(() => localStorage.getItem('elvarium-logo'));
};

export const saveLogo = (base64String: string): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-logo', base64String));
};

export const getAuthBanner = (): Promise<string | null> => {
    return request(() => localStorage.getItem('elvarium-auth-banner'));
};

export const saveAuthBanner = (base64String: string): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-auth-banner', base64String));
};

// -- Home View --
export const getSynopsis = (): Promise<string | null> => {
    return request(() => localStorage.getItem('elvarium-synopsis'));
};

export const saveSynopsis = (synopsis: string): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-synopsis', synopsis));
};

export const getSynopsisBanner = (): Promise<string | null> => {
    return request(() => localStorage.getItem('elvarium-synopsis-banner'));
};

export const saveSynopsisBanner = (base64String: string): Promise<void> => {
    return request(() => localStorage.setItem('elvarium-synopsis-banner', base64String));
};

// -- Characters --
export const getCharacters = (characterType: CharacterType): Promise<Character[]> => {
    const storageKey = `elvarium-characters-${characterType}`;
    return request(() => getParsedItem<Character[]>(storageKey, []));
};

export const saveCharacters = (characterType: CharacterType, characters: Character[]): Promise<void> => {
    const storageKey = `elvarium-characters-${characterType}`;
    return request(() => localStorage.setItem(storageKey, JSON.stringify(characters)));
};
