// src/controllers/halalController.ts

import { Request, Response } from 'express';
import { ai, halalSchema, HalalCheckResponse } from '../utils/geminiClient';

// Interface for the expected request body
interface HalalCheckRequest extends Request {
    body: {
        text: string;
    };
}

export const checkHalalStatus = async (req: HalalCheckRequest, res: Response) => {
    // Get the text from the request body
    const ingredientText: string = req.body.text;

    if (!ingredientText) {
        return res.status(400).json({ error: 'Missing "text" in request body.' });
    }

    try {
        const prompt = `
        Analyze the following product ingredient list or description: "${ingredientText}".
        
        Your task is a comprehensive Halal analysis. Follow these steps meticulously:
        
        1.  **Extract and Identify All Components:** Extract every listed component, including **specific ingredients**, **E-codes (E-number additives)**, and any **chemical or technical names**.
        2.  **Determine Status (Halal/Haram/Musbooh):** For each extracted component, determine its Halal, Haram, or Musbooh (Doubtful) status based on general Islamic dietary laws. Pay special attention to the *source* of E-codes (e.g., E471/Mono- and diglycerides, which can be animal or plant-derived).
        3.  **Provide Source/Note:** For any ingredient or E-code whose status is **Haram** or **Musbooh**, clearly state the potential source (e.g., 'porcine gelatin,' 'alcohol-derived,' 'animal/plant-based, needs source confirmation').
        4.  **Overall Status:** Based on the presence of any confirmed **Haram** ingredients, determine the final overall product status (**HARAM**, **HALAL**, or **MUSBOOH**).
    
        ***
        **Crucial Rule:** If an E-code or chemical name has potential animal or alcoholic sources and the source is not specified in the input text, you **must** categorize it as **MUSBOOH** and note the requirement for source confirmation.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an expert Halal food status checker. Respond ONLY with a valid JSON object following the provided schema, based strictly on the input ingredient text.",
                responseMimeType: "application/json",
                responseSchema: halalSchema,
                temperature: 0.1
            }
        });

        // Parse the JSON string and explicitly cast it to the interface
        const resultJson: HalalCheckResponse = JSON.parse(response?.text || '{}');

        // Send the typed response
        res.json(resultJson);

    } catch (error) {
        console.error('Error in checkHalalStatus:', error);
        // Type assertion for error
        const errorMessage = (error as Error).message;

        const statusCode = errorMessage.includes("API_KEY") ? 503 : 500;
        res.status(statusCode).json({
            error: 'An error occurred during the Halal analysis.',
            details: errorMessage
        });
    }
};