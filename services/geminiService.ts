import { GoogleGenAI, Modality } from "@google/genai";
import { Character } from '../types';

// The API key is automatically provided in the execution environment.
// FIX: Use process.env.API_KEY as per the guidelines to fix the TypeScript error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generationFields: (keyof Character)[] = ['about', 'biography', 'personality', 'appearanceDescription', 'powers', 'relationships', 'trivia', 'name', 'status', 'birthplace', 'age'];

/**
 * Generates a specific detail for a character using the Gemini API.
 * @param character - The character object, can be partial.
 * @param detailToGenerate - The specific field to generate content for.
 * @returns The generated text content as a string.
 */
export async function generateCharacterDetail(
  character: Partial<Character>,
  detailToGenerate: keyof Pick<Character, 'about' | 'biography' | 'personality' | 'appearanceDescription' | 'powers' | 'relationships' | 'trivia'>
): Promise<string> {
  
  // Build a context string from existing character data to guide the AI
  const context = generationFields
    .filter(key => key !== detailToGenerate && character[key as keyof Character])
    .map(key => `${String(key).charAt(0).toUpperCase() + String(key).slice(1)}: ${character[key as keyof Character]}`)
    .join('\n');

  const prompt = `You are a creative writer building a world for a fantasy novel called "Elvarium".
Based on the following character information, write a compelling "${detailToGenerate}" section for them.
Keep the response concise and focused on the requested detail. Do not repeat the character's name or the section title in your response. Only provide the text for the section itself.

## Character Information
${context}

## Generate the "${detailToGenerate}" section:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating character detail:", error);
    // Provide a user-friendly error message
    return "Error: Could not generate content from AI. Please check the console for more details.";
  }
}

/**
 * Generates a character portrait image using the Gemini API.
 * @param character - The character object to base the image on.
 * @returns A base64 encoded string of the generated PNG image.
 */
export async function generateCharacterImage(
  character: Partial<Character>
): Promise<string> {
  const prompt = `A high-quality, detailed fantasy character portrait of ${character.name || 'a character'}.
  
Appearance: ${character.appearanceDescription || 'not specified'}.
Personality: ${character.personality || 'not specified'}.
Key details: ${character.about || 'A mysterious figure.'}

Style: Digital painting, fantasy art, detailed, character concept art, vibrant colors, epic.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // This is the base64 string
      }
    }
    throw new Error("No image data found in the response.");

  } catch (error) {
    console.error("Error generating character image:", error);
    throw new Error("Failed to generate image from AI. See console for details.");
  }
}
