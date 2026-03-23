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

    async checkHalalStatus(checkHalalDto: CheckHalalDto, userId?: number): Promise<HalalCheckResponse & { id?: number }> {
        const { text, ingredients_hash } = checkHalalDto;

        if (ingredients_hash) {
            try {
                // Check if the exact ingredients are already analyzed
                const query = `SELECT * FROM halal_checks WHERE ingredients_hash = $1 LIMIT 1`;
                const dbResult = await this.databaseService.query(query, [ingredients_hash]);

                if (dbResult.rows && dbResult.rows.length > 0) {
                    const row = dbResult.rows[0];
                    console.log('Returning matched analysis from database for hash:', ingredients_hash);

                    if (userId) {
                        await this.saveScanHistory(userId, row.id);
                    }

                    return {
                        id: row.id,
                        overall_status: row.overall_status,
                        reasoning: row.reasoning,
                        ingredients_analysis: typeof row.ingredients_analysis === 'string'
                            ? JSON.parse(row.ingredients_analysis)
                            : row.ingredients_analysis,
                        front_image: row.front_image,
                        back_image: row.back_image,
                        ingredients_image: row.ingredients_image
                    } as HalalCheckResponse & { id: number };
                }
            } catch (err) {
                console.error('Failed to query database for existing hash:', err);
                // Continue to OpenAI API if DB query fails
            }
        }

        const result = await this.openAIService.checkHalalStatus(text);

        try {
            const savedResult = await this.saveCheckResult(checkHalalDto, result);
            
            if (userId) {
                await this.saveScanHistory(userId, savedResult.id);
            }

            return {
                ...result,
                id: savedResult.id,
                front_image: checkHalalDto.front_image,
                back_image: checkHalalDto.back_image,
                ingredients_image: checkHalalDto.ingredients_image
            };
        } catch (err) {
            console.error('Failed to save halal check result:', err);
            throw new Error('Database error: ' + (err as Error).message);
        }
    }

    private async saveCheckResult(checkHalalDto: CheckHalalDto, result: HalalCheckResponse): Promise<{ id: number }> {
        const { text, front_image, back_image, ingredients_image, ingredients_hash } = checkHalalDto;
        const query = `
            INSERT INTO halal_checks (
                ingredient_text, 
                overall_status, 
                reasoning, 
                ingredients_analysis,
                front_image,
                back_image,
                ingredients_image,
                ingredients_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        const values = [
            text,
            result.overall_status,
            result.reasoning,
            JSON.stringify(result.ingredients_analysis),
            front_image || null,
            back_image || null,
            ingredients_image || null,
            ingredients_hash || null
        ];

        const dbResult = await this.databaseService.query(query, values);
        return { id: dbResult.rows[0].id };
    }

    async saveScanHistory(userId: number, halalCheckId: number) {
        const query = `
            INSERT INTO user_scan_history (user_id, halal_check_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING id
        `;
        const values = [userId, halalCheckId];
        return this.databaseService.query(query, values);
    }

    async getUserScanHistory(userId: number) {
        const query = `
            SELECT 
                h.id,
                h.ingredient_text,
                h.overall_status,
                h.reasoning,
                h.ingredients_analysis,
                h.front_image,
                h.back_image,
                h.ingredients_image,
                h.created_at as analyzed_at,
                ush.created_at as saved_at
            FROM user_scan_history ush
            JOIN halal_checks h ON ush.halal_check_id = h.id
            WHERE ush.user_id = $1
            ORDER BY ush.created_at DESC
        `;
        const values = [userId];
        const result = await this.databaseService.query(query, values);
        
        return result.rows.map(row => ({
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis
        }));
    }
}

