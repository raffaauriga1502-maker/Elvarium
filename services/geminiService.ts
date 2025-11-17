import { Character } from "../types";

// Mock service to prevent build errors while GenAI is disabled.
// We underscore prefixes to parameters to prevent "Unused variable" errors in strict TypeScript builds.
export const translateCharacterFields = async (
  _character: Character,
  _targetLanguage: string
): Promise<Partial<Character>> => {
    console.warn("Translation service is currently disabled.");
    return {};
};