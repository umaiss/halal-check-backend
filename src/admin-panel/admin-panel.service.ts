import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { S3Service } from '../s3/s3.service';
import * as fs from 'fs';
import * as path from 'path';
import { App, initializeApp, cert } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { ReviewProductDto } from './dto/review-product.dto';

@Injectable()
export class AdminPanelService implements OnModuleInit {
    private firebaseApp: App | null = null;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly s3Service: S3Service,
    ) { }

    onModuleInit() {
        const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH || 'firebase-service-account.json';
        const absolutePath = path.resolve(process.cwd(), credentialsPath);

        if (fs.existsSync(absolutePath)) {
            try {
                const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
                this.firebaseApp = initializeApp({
                    credential: cert(serviceAccount),
                }, 'halal-checker-push-app');
                console.log('🔥 Firebase Admin initialized successfully for push notifications');
            } catch (error) {
                console.error('❌ Failed to initialize Firebase Admin SDK:', error);
            }
        } else {
            console.warn(`⚠️ Firebase credentials file not found at: ${absolutePath}. Simulated console logs will be used for push notifications.`);
        }
    }

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
        const selectQuery = `SELECT assigned_to_id, overall_status, product_name FROM halal_checks WHERE id = $1`;
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

        const { status, reasoning, attachments, ingredients_analysis } = reviewDto;

        // overall_status is used by the mobile app — update it to reflect the final verdict.
        const overallStatus = status.toUpperCase() === 'MUSHBOOH' ? 'MUSBOOH' : status.toUpperCase();

        const isStatusChanged = product.overall_status !== overallStatus;

        let queryFields = `
            status = $1,
            reasoning = $2,
            overall_status = $3,
            reviewed_at = CURRENT_TIMESTAMP
        `;
        const params: any[] = [status, reasoning, overallStatus, id];
        let paramIndex = 5;

        if (attachments !== undefined) {
            queryFields += `, review_attachments = $${paramIndex}`;
            params.push(attachments);
            paramIndex++;
        }

        if (ingredients_analysis !== undefined) {
            queryFields += `, ingredients_analysis = $${paramIndex}`;
            params.push(typeof ingredients_analysis === 'object' ? JSON.stringify(ingredients_analysis) : ingredients_analysis);
            paramIndex++;
        }

        const updateQuery = `
            UPDATE halal_checks 
            SET ${queryFields}
            WHERE id = $4
            RETURNING *
        `;

        const updateResult = await this.databaseService.query(updateQuery, params);

        if (isStatusChanged) {
            this.sendPushNotifications(id, product.product_name, overallStatus).catch(err => {
                console.error('Failed to trigger push notifications:', err);
            });
        }

        const row = updateResult.rows[0];
        const parsedProduct = {
            ...row,
            ingredients_analysis: typeof row.ingredients_analysis === 'string'
                ? JSON.parse(row.ingredients_analysis)
                : row.ingredients_analysis,
            additional_images: typeof row.additional_images === 'string'
                ? JSON.parse(row.additional_images)
                : row.additional_images,
        };

        return { message: 'Product review submitted successfully', product: parsedProduct };
    }

    async uploadAttachments(id: number, files: Array<Express.Multer.File>) {
        if (!files || files.length === 0) {
            return { message: 'No files provided', attachments: [] };
        }

        // Fetch product to get product_name for the S3 folder path
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

        // Upload all files to S3 via the shared S3Service
        const folder = `review-attachments/${productNameClean}`;
        const uploadedUrls = await this.s3Service.uploadFiles(folder, files);

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

    async sendPushNotifications(productId: number, productName: string, newStatus: string) {
        try {
            // Find all users who scanned this product and have an fcm_token
            const usersQuery = `
                SELECT DISTINCT u.id, u.fcm_token, u.name 
                FROM user_scan_history ush
                JOIN users u ON ush.user_id = u.id
                WHERE ush.halal_check_id = $1 AND u.fcm_token IS NOT NULL
            `;
            const result = await this.databaseService.query(usersQuery, [productId]);
            const users = result.rows;

            if (users.length === 0) {
                console.log(`[Notification] No users to notify for product status change of ID: ${productId}`);
                return;
            }

            const title = 'Product Status Updated';
            const body = `The status of "${productName || `Product #${productId}`}" has been updated to ${newStatus.toUpperCase()}.`;

            console.log(`[Notification] Sending status update notifications for product: ${productName || productId} to ${users.length} users.`);

            if (this.firebaseApp) {
                const tokens = users.map(user => user.fcm_token).filter(Boolean);
                if (tokens.length > 0) {
                    const response = await getMessaging(this.firebaseApp).sendEachForMulticast({
                        tokens,
                        notification: { title, body },
                        data: { productId: String(productId), newStatus },
                    });
                    console.log(`🔥 [FCM Multicast Push Sent] Success: ${response.successCount}, Failure: ${response.failureCount}`);
                }
            } else {
                for (const user of users) {
                    console.log(`🔔 [PUSH NOTIFICATION SIMULATED] To User ID: ${user.id} (${user.name})`);
                    console.log(`   Token: ${user.fcm_token}`);
                    console.log(`   Title: ${title}`);
                    console.log(`   Body: ${body}`);
                    console.log(`   Data:`, { productId: String(productId), newStatus });
                }
            }
        } catch (error) {
            console.error('Failed to send push notifications:', error);
        }
    }
}

