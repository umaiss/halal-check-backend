import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { HalalCheckResponse } from './interfaces/halal-response.interface';

@Injectable()
export class OpenAIService {
    private readonly openai: OpenAI;
    private readonly modelName: string = 'gpt-4o-mini';

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not found in environment variables.');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }

    async checkHalalStatus(ingredientText: string): Promise<HalalCheckResponse> {
        const prompt = `Analyze the following product ingredient list or description: "${ingredientText}".

Your task is a comprehensive Halal analysis. Follow these steps meticulously:

1. **Extract and Identify All Components:** Extract every listed component, including **specific ingredients**, **E-codes (E-number additives)**, and any **chemical or technical names**.
2. **Determine Status (Halal/Haram/Musbooh):** For each extracted component, determine its Halal, Haram, or Musbooh (Doubtful) status based on general Islamic dietary laws. Pay special attention to the *source* of E-codes (e.g., E471/Mono- and diglycerides, which can be animal or plant-derived).
3. **Provide Source/Note:** For any ingredient or E-code whose status is **Haram** or **Musbooh**, clearly state the potential source (e.g., 'porcine gelatin,' 'alcohol-derived,' 'animal/plant-based, needs source confirmation').
4. **Overall Status:** Based on the presence of any confirmed **Haram** ingredients, determine the final overall product status (**HARAM**, **HALAL**, or **MUSBOOH**).

**Crucial Rule:** If an E-code or chemical name has potential animal or alcoholic sources and the source is not specified in the input text, you **must** categorize it as **MUSBOOH** and note the requirement for source confirmation.

You MUST respond with ONLY a valid JSON object in this exact format:
{
    "overall_status": "HALAL" | "HARAM" | "MUSBOOH",
    "reasoning": "Brief explanation of the overall status",
    "ingredients_analysis": [
        {
            "component_name": "ingredient or E-code name",
            "component_type": "INGREDIENT" | "E_CODE" | "CHEMICAL_ADDITIVE",
            "status": "HALAL" | "HARAM" | "MUSBOOH",
            "note": "Explanation of status and source if applicable"
        }
    ]
}

Do not include any text before or after the JSON object. Only return valid JSON.`;

        const response = await this.openai.chat.completions.create({
            model: this.modelName,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert Halal food status checker. Respond ONLY with a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const responseText = response.choices[0].message.content;

        if (!responseText) {
            throw new Error('Empty response from OpenAI');
        }

        // Remove any markdown code blocks if present
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        try {
            return JSON.parse(cleanedResponse) as HalalCheckResponse;
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.error('Raw response:', responseText);
            throw new Error('Failed to parse JSON response from OpenAI');
        }
    }
}
