import { Injectable, ForbiddenException } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { DatabaseService } from '../database/database.service';
import { HalalCheckResponse } from '../openai/interfaces/halal-response.interface';
import { CheckHalalDto } from './dto/check-halal.dto';
import { ImproveCheckDto } from './dto/improve-check.dto';

@Injectable()
export class HalalService {
    constructor(
        private readonly openAIService: OpenAIService,
        private readonly databaseService: DatabaseService,
    ) { }

    async checkHalalStatus(checkHalalDto: CheckHalalDto, userId?: number): Promise<HalalCheckResponse & { id?: number; updated_points?: number }> {
        const { text, ingredients_hash, product_name } = checkHalalDto;
        let updatedPoints: number | undefined = undefined;

        if (userId) {
            const userRes = await this.databaseService.query('SELECT points FROM users WHERE id = $1', [userId]);
            const points = userRes.rows[0]?.points ?? 100;
            if (points < 5) {
                throw new ForbiddenException('Insufficient points. You need at least 5 points to scan a product.');
            }
        }

        if (ingredients_hash || product_name) {
            try {
                // Prioritise exact ingredients match over product name to prevent incorrect cached results for different product variations/flavours.
                let query = `SELECT * FROM halal_checks WHERE `;
                const params: any[] = [];
                
                if (ingredients_hash) {
                    query += `ingredients_hash = $1`;
                    params.push(ingredients_hash);
                } else {
                    query += `product_name = $1`;
                    params.push(product_name);
                }
                
                query += ` LIMIT 1`;
                const dbResult = await this.databaseService.query(query, params);

                if (dbResult.rows && dbResult.rows.length > 0) {
                    const row = dbResult.rows[0];
                    console.log('Returning matched analysis from database for hash:', ingredients_hash);

                    if (userId) {
                        await this.saveScanHistory(userId, row.id);
                        const updateRes = await this.databaseService.query(
                            'UPDATE users SET points = points - 5 WHERE id = $1 RETURNING points',
                            [userId]
                        );
                        updatedPoints = updateRes.rows[0]?.points;
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
                        ingredients_image: row.ingredients_image,
                        product_name: row.product_name,
                        barcode_image: row.barcode_image,
                        manufacturer_image: row.manufacturer_image,
                        additional_images: typeof row.additional_images === 'string'
                            ? JSON.parse(row.additional_images)
                            : row.additional_images,
                        updated_points: updatedPoints,
                    } as HalalCheckResponse & { id: number; updated_points?: number };
                }
            } catch (err) {
                console.error('Failed to query database for existing hash:', err);
                // Continue to OpenAI API if DB query fails
            }
        }

        const result = await this.openAIService.checkHalalStatus(text);

        if (result.ingredients_found === false) {
            console.log('No ingredients found by OpenAI. Skipping database persistence.');
            return {
                ...result,
                id: undefined,
                front_image: checkHalalDto.front_image,
                back_image: checkHalalDto.back_image,
                ingredients_image: checkHalalDto.ingredients_image
            };
        }

        try {
            const savedResult = await this.saveCheckResult(checkHalalDto, result);

            if (userId) {
                await this.saveScanHistory(userId, savedResult.id);
                const updateRes = await this.databaseService.query(
                    'UPDATE users SET points = points - 5 WHERE id = $1 RETURNING points',
                    [userId]
                );
                updatedPoints = updateRes.rows[0]?.points;
            }

            return {
                ...result,
                id: savedResult.id,
                front_image: checkHalalDto.front_image,
                back_image: checkHalalDto.back_image,
                ingredients_image: checkHalalDto.ingredients_image,
                updated_points: updatedPoints,
            };
        } catch (err) {
            console.error('Failed to save halal check result:', err);
            throw new Error('Database error: ' + (err as Error).message);
        }
    }

    private async saveCheckResult(checkHalalDto: CheckHalalDto, result: HalalCheckResponse): Promise<{ id: number }> {
        const { text, front_image, back_image, ingredients_image, ingredients_hash, product_name } = checkHalalDto;
        const query = `
            INSERT INTO halal_checks (
                ingredient_text, 
                overall_status, 
                reasoning, 
                ingredients_analysis,
                front_image,
                back_image,
                ingredients_image,
                ingredients_hash,
                product_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
            ingredients_hash || null,
            product_name || null
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
                h.product_name,
                h.ingredient_text,
                h.overall_status,
                h.reasoning,
                h.ingredients_analysis,
                h.front_image,
                h.back_image,
                h.ingredients_image,
                h.barcode_image,
                h.manufacturer_image,
                h.additional_images,
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
                : row.ingredients_analysis,
            additional_images: typeof row.additional_images === 'string'
                ? JSON.parse(row.additional_images)
                : row.additional_images,
        }));
    }

    async improveCheck(id: number, improveCheckDto: ImproveCheckDto, userId?: number) {
        const { barcode_image, manufacturer_image, additional_images, front_image, back_image } = improveCheckDto;
        
        const query = `
            UPDATE halal_checks 
            SET 
                barcode_image = COALESCE($1, barcode_image),
                manufacturer_image = COALESCE($2, manufacturer_image),
                additional_images = COALESCE($3, additional_images),
                front_image = COALESCE($4, front_image),
                back_image = COALESCE($5, back_image)
            WHERE id = $6
            RETURNING *
        `;
        
        const values = [
            barcode_image || null,
            manufacturer_image || null,
            additional_images ? JSON.stringify(additional_images) : null,
            front_image || null,
            back_image || null,
            id
        ];
        
        const result = await this.databaseService.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }

        let updatedPoints: number | undefined = undefined;
        if (userId) {
            const hasProvidedImage = barcode_image || manufacturer_image || front_image || back_image || (additional_images && additional_images.length > 0);
            if (hasProvidedImage) {
                const updateRes = await this.databaseService.query(
                    'UPDATE users SET points = points + 10 WHERE id = $1 RETURNING points',
                    [userId]
                );
                updatedPoints = updateRes.rows[0]?.points;
            }
        }
        
        return {
            ...result.rows[0],
            updated_points: updatedPoints,
        };
    }

    async searchProducts(query: string) {
        const sqlQuery = `
            SELECT 
                id, 
                product_name, 
                overall_status, 
                reasoning, 
                ingredients_analysis,
                front_image,
                back_image,
                ingredients_image,
                barcode_image,
                manufacturer_image,
                additional_images,
                created_at
            FROM halal_checks 
            WHERE product_name ILIKE $1
            ORDER BY created_at DESC
            LIMIT 10
        `;
        const values = [`%${query}%`];
        const result = await this.databaseService.query(sqlQuery, values);
        
        return result.rows.map(row => ({
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis,
            additional_images: typeof row.additional_images === 'string'
                ? JSON.parse(row.additional_images)
                : row.additional_images,
        }));
    }
}
