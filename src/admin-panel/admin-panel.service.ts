import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { ReviewProductDto } from './dto/review-product.dto';
import * as path from 'path';

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
                h.reviewed_at,
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
                : row.ingredients_analysis,
            additional_images: typeof row.additional_images === 'string'
                ? JSON.parse(row.additional_images)
                : row.additional_images,
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
                h.review_attachments,
                h.created_at,
                h.assigned_to_id,
                h.status,
                h.reviewed_at,
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
                : row.ingredients_analysis,
            additional_images: typeof row.additional_images === 'string'
                ? JSON.parse(row.additional_images)
                : row.additional_images,
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
                back_image,
                ingredients_image,
                created_at,
                reviewed_at
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
                h.back_image,
                h.ingredients_image,
                h.created_at,
                h.reviewed_at,
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

        const { status, reasoning, attachments } = reviewDto;

        // overall_status is used by the mobile app — update it to reflect the final verdict.
        const overallStatus = status.toUpperCase() === 'MUSHBOOH' ? 'MUSBOOH' : status.toUpperCase();

        let updateResult;
        if (attachments !== undefined) {
            const updateQuery = `
                UPDATE halal_checks 
                SET 
                    status = $1,
                    reasoning = $2,
                    overall_status = $3,
                    reviewed_at = CURRENT_TIMESTAMP,
                    review_attachments = $5
                WHERE id = $4
                RETURNING *
            `;
            updateResult = await this.databaseService.query(updateQuery, [status, reasoning, overallStatus, id, attachments]);
        } else {
            const updateQuery = `
                UPDATE halal_checks 
                SET 
                    status = $1,
                    reasoning = $2,
                    overall_status = $3,
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            updateResult = await this.databaseService.query(updateQuery, [status, reasoning, overallStatus, id]);
        }

        return { message: 'Product review submitted successfully', product: updateResult.rows[0] };
    }

    async uploadAttachments(id: number, files: Array<Express.Multer.File>) {
        if (!files || files.length === 0) {
            return { message: 'No files provided', attachments: [] };
        }

        // Fetch product to get product_name
        const selectQuery = `SELECT product_name FROM halal_checks WHERE id = $1`;
        const selectResult = await this.databaseService.query(selectQuery, [id]);
        let productNameClean = `product_${id}`;
        if (selectResult.rows.length > 0 && selectResult.rows[0].product_name) {
            productNameClean = selectResult.rows[0].product_name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-_]/g, '_')
                .replace(/_+/g, '_');
        }

        // Initialize AWS S3 client
        const awsRegion = process.env.AWS_REGION;
        const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const bucket = process.env.AWS_S3_BUCKET;

        if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey || !bucket) {
            throw new Error('AWS S3 configuration missing. Ensure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are set.');
        }

        const s3 = new S3Client({
            region: awsRegion,
            credentials: {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            },
        });

        const uploadedUrls: string[] = [];

        for (const file of files) {
            // Use sanitized product name instead of ID
            const filePath = `review-attachments/${productNameClean}/${Date.now()}_${file.originalname}`;
            // Read file buffer (if stored on disk) or use buffer directly
            const fileBuffer = file.buffer ?? fs.readFileSync(file.path);

            // Upload the file to AWS S3
            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: filePath,
                Body: fileBuffer,
                ContentType: file.mimetype,
            }));

            // Construct the public URL (bucket must have public read policy)
            const publicURL = `https://${bucket}.s3.${awsRegion}.amazonaws.com/${filePath}`;
            uploadedUrls.push(publicURL);
        }

        // Update the product's review_attachments column by concatenating new URLs
        const updateQuery = `
            UPDATE halal_checks
            SET review_attachments = COALESCE(review_attachments, ARRAY[]::TEXT[]) || $1
            WHERE id = $2
            RETURNING *
        `;
        const updateResult = await this.databaseService.query(updateQuery, [uploadedUrls, id]);
        return { message: 'Attachments uploaded successfully', attachments: uploadedUrls, product: updateResult.rows[0] };
    }

    // Admin stats endpoint
    async getAdminStats() {
        const query = `
            SELECT
                COUNT(*) AS total_count,
                COUNT(*) FILTER (WHERE status = 'halal') AS halal_count,
                COUNT(*) FILTER (WHERE status = 'haram') AS haram_count,
                COUNT(*) FILTER (WHERE status = 'mushbooh') AS mushbooh_count,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
            FROM halal_checks
        `;
        const result = await this.databaseService.query(query);
        const row = result.rows[0];
        return {
            total: Number(row.total_count),
            halal: Number(row.halal_count),
            haram: Number(row.haram_count),
            mushbooh: Number(row.mushbooh_count),
            pending: Number(row.pending_count),
        };
    }
}

