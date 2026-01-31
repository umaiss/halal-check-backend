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
        const { text } = checkHalalDto;
        const result = await this.openAIService.checkHalalStatus(text);

        // Save the result to the database asynchronously
        this.saveCheckResult(text, result).catch(err => {
            console.error('Failed to save halal check result:', err);
        });

        return result;
    }

    private async saveCheckResult(text: string, result: HalalCheckResponse) {
        const query = `
            INSERT INTO halal_checks (ingredient_text, overall_status, reasoning, ingredients_analysis)
            VALUES ($1, $2, $3, $4)
        `;
        const values = [
            text,
            result.overall_status,
            result.reasoning,
            JSON.stringify(result.ingredients_analysis),
        ];

        await this.databaseService.query(query, values);
    }
}
