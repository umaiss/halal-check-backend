import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { DatabaseService } from '../database/database.service';
import { HalalCheckResponse } from '../openai/interfaces/halal-response.interface';
import { CheckHalalDto } from './dto/check-halal.dto';

@Injectable()
export class HalalService {
    constructor(
        private readonly openAIService: OpenAIService,
        private readonly databaseService: DatabaseService,
    ) { }

    async checkHalalStatus(checkHalalDto: CheckHalalDto): Promise<HalalCheckResponse> {
        const { text, front_image, back_image, ingredients_image } = checkHalalDto;
        const result = await this.openAIService.checkHalalStatus(text);

        try {
            await this.saveCheckResult(checkHalalDto, result);
        } catch (err) {
            console.error('Failed to save halal check result:', err);
            throw new Error('Database error: ' + (err as Error).message);
        }

        return result;
    }

    private async saveCheckResult(checkHalalDto: CheckHalalDto, result: HalalCheckResponse) {
        const { text, front_image, back_image, ingredients_image } = checkHalalDto;
        const query = `
            INSERT INTO halal_checks (
                ingredient_text, 
                overall_status, 
                reasoning, 
                ingredients_analysis,
                front_image,
                back_image,
                ingredients_image
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
            text,
            result.overall_status,
            result.reasoning,
            JSON.stringify(result.ingredients_analysis),
            front_image || null,
            back_image || null,
            ingredients_image || null,
        ];

        await this.databaseService.query(query, values);
    }
}
