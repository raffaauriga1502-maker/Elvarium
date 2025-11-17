import { GoogleGenAI } from "@google/genai";
import { Character } from "../types";

export const translateCharacterFields = async (
  character: Character,
  targetLanguage: string
): Promise<Partial<Character>> => {
  try {
    // API Key is injected by Vite at build time via 'define' in vite.config.ts
    // It replaces 'process.env.API_KEY' with the actual string value.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key is missing. Please add 'API_KEY' to your Vercel Environment Variables.");
    }

    // Initialize the client
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // We only translate the text-heavy prose fields.
    // Vital stats (numbers) and arrays (like gallery) are preserved or handled separately.
    const contentToTranslate = {
      biography: character.biography,
      personality: character.personality,
      appearanceDescription: character.appearanceDescription,
      powers: character.powers,
      trivia: character.trivia,
      birthplace: character.birthplace,
      relationships: character.relationships // legacy text field
    };

    const prompt = `You are a professional translator and creative writer. 
    Translate the values of the following JSON content into ${targetLanguage}. 
    
    Rules:
    1. Maintain the original tone, style, and formatting (including line breaks).
    2. Do not translate proper nouns (names of places or people) unless they have a widely accepted translation.
    3. Return ONLY the valid JSON object with the translated values.
    
    JSON to translate:
    ${JSON.stringify(contentToTranslate)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
          responseMimeType: 'application/json',
          temperature: 0.3 // Lower temperature for more accurate translation
      }
    });

    if (!response.text) throw new Error("No response from AI");
    
    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Translation failed:", error);
    // Re-throw with a user-friendly message if possible
    throw new Error(error.message || "Translation failed.");
  }
};