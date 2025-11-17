
import { Character } from "../types";

// Mock service to prevent build errors while GenAI is disabled.
export const translateCharacterFields = async (
  character: Character,
  targetLanguage: string
): Promise<Partial<Character>> => {
    console.warn("Translation service is currently disabled.");
    return {};
};
