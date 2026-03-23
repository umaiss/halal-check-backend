import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminPanelService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getAllScannedProducts() {
        const query = `
            SELECT 
                id, 
                ingredient_text, 
                overall_status, 
                reasoning, 
                ingredients_analysis, 
                front_image, 
                back_image, 
                ingredients_image, 
                ingredients_hash,
                created_at
            FROM halal_checks 
            ORDER BY created_at DESC
        `;
        const result = await this.databaseService.query(query);
        
        return result.rows.map(row => ({
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis
        }));
    }
}
