import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ReviewProductDto } from './dto/review-product.dto';

@Injectable()
export class AdminPanelService {
    constructor(private readonly databaseService: DatabaseService) { }

    async getAllScannedProducts(user: any) {
        // JOIN admin_users so the admin can see which assignee reviewed each product
        let query = `
            SELECT 
                h.id, 
                h.ingredient_text, 
                h.overall_status, 
                h.reasoning, 
                h.ingredients_analysis, 
                h.front_image, 
                h.back_image, 
                h.ingredients_image, 
                h.ingredients_hash,
                h.product_name,
                h.barcode_image,
                h.manufacturer_image,
                h.additional_images,
                h.created_at,
                h.assigned_to_id,
                h.status,
                a.email AS reviewer_email
            FROM halal_checks h
            LEFT JOIN admin_users a ON a.id = h.assigned_to_id
        `;
        const params: any[] = [];

        if (user.role === 'assignee') {
            query += ` WHERE h.assigned_to_id IS NULL OR h.assigned_to_id = $1 `;
            params.push(user.userId);
        }

        query += ` ORDER BY h.created_at DESC `;

        const result = await this.databaseService.query(query, params);

        return result.rows.map(row => ({
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis
        }));
    }

    async getProduct(id: number, user: any) {
        let query = `
            SELECT 
                h.id, 
                h.ingredient_text, 
                h.overall_status, 
                h.reasoning, 
                h.ingredients_analysis, 
                h.front_image, 
                h.back_image, 
                h.ingredients_image, 
                h.ingredients_hash,
                h.product_name,
                h.barcode_image,
                h.manufacturer_image,
                h.additional_images,
                h.created_at,
                h.assigned_to_id,
                h.status,
                a.email AS reviewer_email
            FROM halal_checks h
            LEFT JOIN admin_users a ON a.id = h.assigned_to_id
            WHERE h.id = $1
        `;

        if (user.role === 'assignee') {
            query += ` AND (h.assigned_to_id IS NULL OR h.assigned_to_id = $2) `;
        }

        const result = await this.databaseService.query(query, user.role === 'assignee' ? [id, user.userId] : [id]);

        if (result.rows.length === 0) {
            throw new NotFoundException('Product not found or access denied');
        }

        const row = result.rows[0];
        return {
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis
        };
    }

    async getMyStats(userId: string) {
        // Aggregate counts of reviewed products for this assignee
        const statsQuery = `
            SELECT
                COUNT(*) FILTER (WHERE status != 'pending') AS total_reviewed,
                COUNT(*) FILTER (WHERE status = 'halal')    AS halal_count,
                COUNT(*) FILTER (WHERE status = 'haram')    AS haram_count,
                COUNT(*) FILTER (WHERE status = 'mushbooh') AS mushbooh_count
            FROM halal_checks
            WHERE assigned_to_id = $1
        `;
        const statsResult = await this.databaseService.query(statsQuery, [userId]);
        const stats = statsResult.rows[0];

        // Full list of completed (non-pending) reviews for this assignee
        const historyQuery = `
            SELECT
                id,
                ingredient_text,
                overall_status,
                status,
                reasoning,
                product_name,
                barcode_image,
                manufacturer_image,
                additional_images,
                front_image,
                created_at
            FROM halal_checks
            WHERE assigned_to_id = $1
              AND status != 'pending'
            ORDER BY created_at DESC
        `;
        const historyResult = await this.databaseService.query(historyQuery, [userId]);

        return {
            total_reviewed: Number(stats.total_reviewed),
            halal_count: Number(stats.halal_count),
            haram_count: Number(stats.haram_count),
            mushbooh_count: Number(stats.mushbooh_count),
            reviewed_products: historyResult.rows,
        };
    }

    async getAllReviews() {
        const statsQuery = `
            SELECT
                COUNT(*) FILTER (WHERE status != 'pending') AS total_reviewed,
                COUNT(*) FILTER (WHERE status = 'halal')    AS halal_count,
                COUNT(*) FILTER (WHERE status = 'haram')    AS haram_count,
                COUNT(*) FILTER (WHERE status = 'mushbooh') AS mushbooh_count
            FROM halal_checks
        `;
        const statsResult = await this.databaseService.query(statsQuery);
        const stats = statsResult.rows[0];

        const historyQuery = `
            SELECT
                h.id,
                h.ingredient_text,
                h.overall_status,
                h.status,
                h.reasoning,
                h.product_name,
                h.barcode_image,
                h.manufacturer_image,
                h.additional_images,
                h.front_image,
                h.created_at,
                a.email AS reviewer_email
            FROM halal_checks h
            LEFT JOIN admin_users a ON a.id = h.assigned_to_id
            WHERE h.status != 'pending'
            ORDER BY h.created_at DESC
        `;
        const historyResult = await this.databaseService.query(historyQuery);

        return {
            total_reviewed: Number(stats.total_reviewed),
            halal_count: Number(stats.halal_count),
            haram_count: Number(stats.haram_count),
            mushbooh_count: Number(stats.mushbooh_count),
            all_reviews: historyResult.rows,
        };
    }

    async claimProduct(id: number, userId: string) {
        // Find product first to check its assignment status
        const selectQuery = `SELECT assigned_to_id FROM halal_checks WHERE id = $1`;
        const selectResult = await this.databaseService.query(selectQuery, [id]);

        if (selectResult.rows.length === 0) {
            throw new NotFoundException('Product not found');
        }

        const product = selectResult.rows[0];

        if (product.assigned_to_id) {
            if (product.assigned_to_id === userId) {
                return { message: 'Product is already claimed by you' };
            }
            throw new ConflictException('Product is already claimed by another assignee');
        }

        // Claim it
        const updateQuery = `
            UPDATE halal_checks 
            SET assigned_to_id = $1, status = 'pending' 
            WHERE id = $2 AND assigned_to_id IS NULL
            RETURNING *
        `;
        const updateResult = await this.databaseService.query(updateQuery, [userId, id]);

        if (updateResult.rows.length === 0) {
            throw new ConflictException('Failed to claim. Product might have been claimed concurrently');
        }

        return { message: 'Product claimed successfully', product: updateResult.rows[0] };
    }

    async reviewProduct(id: number, userId: string, userRole: string, reviewDto: ReviewProductDto) {
        // Fetch product to verify ownership if they are an assignee
        const selectQuery = `SELECT assigned_to_id FROM halal_checks WHERE id = $1`;
        const selectResult = await this.databaseService.query(selectQuery, [id]);

        if (selectResult.rows.length === 0) {
            throw new NotFoundException('Product not found');
        }

        const product = selectResult.rows[0];

        if (userRole === 'assignee') {
            if (product.assigned_to_id !== userId) {
                throw new ForbiddenException('You can only review products that you have claimed');
            }
        }

        const { status, reasoning } = reviewDto;

        // overall_status is used by the mobile app — update it to reflect the final verdict.
        const overallStatus = status.toUpperCase() === 'MUSHBOOH' ? 'MUSBOOH' : status.toUpperCase();

        const updateQuery = `
            UPDATE halal_checks 
            SET 
                status = $1,
                reasoning = $2,
                overall_status = $3
            WHERE id = $4
            RETURNING *
        `;
        const updateResult = await this.databaseService.query(updateQuery, [status, reasoning, overallStatus, id]);

        return { message: 'Product review submitted successfully', product: updateResult.rows[0] };
    }
}
