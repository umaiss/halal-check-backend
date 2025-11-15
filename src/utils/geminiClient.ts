// src/utils/geminiClient.ts

import { GoogleGenAI } from '@google/genai';

// --- INTERFACES for Type Safety ---

interface IngredientAnalysis {
    component_name: string; // Renamed for clarity: component_name instead of ingredient
    component_type: 'INGREDIENT' | 'E_CODE' | 'CHEMICAL_ADDITIVE'; // New field for categorization
    status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    note: string; // Source or detailed explanation for status
}

export interface HalalCheckResponse {
    overall_status: 'HALAL' | 'HARAM' | 'MUSBOOH';
    reasoning: string;
    ingredients_analysis: IngredientAnalysis[];
}

// --- GEMINI SETUP ---

// Initialize the Gemini client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY', GEMINI_API_KEY);
// if (!GEMINI_API_KEY) {
//     throw new Error("GEMINI_API_KEY not found in environment variables.");
// }

export const ai = new GoogleGenAI({ apiKey: "AIzaSyCT-3rXa-cI1BxGcpIuX2jxPhqYFaXXqEc" });

// Define the desired JSON response structure (Schema)
export const halalSchema = {
    type: "OBJECT",
    properties: {
        overall_status: { type: "STRING", description: "..." },
        reasoning: { type: "STRING", description: "..." },
        ingredients_analysis: {
            type: "ARRAY",
            description: "A list of individual component analyses.",
            items: {
                type: "OBJECT",
                properties: {
                    component_name: { type: "STRING", description: "The name, E-code, or chemical of the component." },
                    component_type: { type: "STRING", description: "Categorization: 'INGREDIENT', 'E_CODE', or 'CHEMICAL_ADDITIVE'." }, // Updated
                    status: { type: "STRING", description: "The status: 'HALAL', 'HARAM', or 'MUSBOOH'." },
                    note: { type: "STRING", description: "A brief note explaining the status and potential source." }
                }
            }
        }
    },
    required: ["overall_status", "reasoning", "ingredients_analysis"]
};