import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Module({
    providers: [S3Service],
    exports: [S3Service],   // export so other modules can inject it
})
export class S3Module {}
