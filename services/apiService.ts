import { User, Character, CharacterType } from '../types';

// Simulate network latency
const FAKE_LATENCY_MS = 200;

const fakeDelay = () => new Promise(resolve => setTimeout(resolve, FAKE_LATENCY_MS));

// --- Generic Local Storage Helpers ---
const getItem = async <T>(key: string): Promise<T | null> => {
    await fakeDelay();
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Error getting item ${key} from localStorage`, error);
        return null;
    }
};

const setItem = async <T>(key: string, value: T): Promise<void> => {
    await fakeDelay();
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting item ${key} in localStorage`, error);
    }
};

const removeItem = async (key: string): Promise<void> => {
    await fakeDelay();
    localStorage.removeItem(key);
};


// --- User Management ---
const USERS_KEY = 'elvarium_users';
const CURRENT_USER_KEY = 'elvarium_current_user';

export const getUsers = (): Promise<User[]> => getItem<User[]>(USERS_KEY).then(users => users || []);
export const saveUsers = (users: User[]): Promise<void> => setItem(USERS_KEY, users);

export const getCurrentUser = (): Promise<User | null> => getItem<User>(CURRENT_USER_KEY);
export const saveCurrentUser = (user: User): Promise<void> => setItem(CURRENT_USER_KEY, user);
export const removeCurrentUser = (): Promise<void> => removeItem(CURRENT_USER_KEY);


// --- Customization ---
const LOGO_KEY = 'elvarium_logo';
const AUTH_BANNER_KEY = 'elvarium_auth_banner';

export const getLogo = (): Promise<string | null> => getItem<string>(LOGO_KEY);
export const saveLogo = (base64String: string): Promise<void> => setItem(LOGO_KEY, base64String);

export const getAuthBanner = (): Promise<string | null> => getItem<string>(AUTH_BANNER_KEY);
export const saveAuthBanner = (base64String: string): Promise<void> => setItem(AUTH_BANNER_KEY, base64String);


// --- Synopsis ---
const SYNOPSIS_KEY = 'elvarium_synopsis';
const SYNOPSIS_BANNER_KEY = 'elvarium_synopsis_banner';

export const getSynopsis = (): Promise<string | null> => getItem<string>(SYNOPSIS_KEY);
export const saveSynopsis = (synopsis: string): Promise<void> => setItem(SYNOPSIS_KEY, synopsis);

export const getSynopsisBanner = (): Promise<string | null> => getItem<string>(SYNOPSIS_BANNER_KEY);
export const saveSynopsisBanner = (base64Url: string): Promise<void> => setItem(SYNOPSIS_BANNER_KEY, base64Url);


// --- Characters ---
const getCharacterKey = (characterType: CharacterType) => `elvarium_characters_${characterType.replace(/\s+/g, '_')}`;

export const getCharacters = (characterType: CharacterType): Promise<Character[] | null> => {
    return getItem<Character[]>(getCharacterKey(characterType));
};

export const saveCharacters = (characterType: CharacterType, characters: Character[]): Promise<void> => {
    return setItem(getCharacterKey(characterType), characters);
};
