import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
    private readonly s3: S3Client;
    private readonly bucket: string;
    private readonly region: string;

    constructor() {
        this.region = process.env.AWS_REGION!;
        this.bucket = process.env.AWS_S3_BUCKET!;

        if (!this.region || !this.bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error('AWS S3 configuration missing. Ensure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are set in .env');
        }

        this.s3 = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
    }

    /**
     * Upload a single file buffer to S3.
     * @param folder  The S3 folder/prefix (e.g. 'product-images', 'review-attachments/product_1')
     * @param file    The Multer file object
     * @returns       The public URL of the uploaded file
     */
    async uploadFile(folder: string, file: Express.Multer.File): Promise<string> {
        const key = `${folder}/${Date.now()}_${file.originalname}`;

        try {
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));
        } catch (err: any) {
            throw new InternalServerErrorException(`Failed to upload ${file.originalname} to S3: ${err.message}`);
        }

        // Public URL — works when bucket has a public-read bucket policy
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    /**
     * Upload multiple files to S3 under the same folder.
     */
    async uploadFiles(folder: string, files: Express.Multer.File[]): Promise<string[]> {
        const urls: string[] = [];
        for (const file of files) {
            const url = await this.uploadFile(folder, file);
            urls.push(url);
        }
        return urls;
    }
}
