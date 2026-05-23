import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

@Injectable()
export class DatabaseService {
    private pool: Pool;

    constructor(private configService: ConfigService) {
        const config: PoolConfig = {
            host: this.configService.get<string>('DB_HOST', 'localhost'),
            port: this.configService.get<number>('DB_PORT', 5432),
            database: this.configService.get<string>('DB_NAME', 'halal_checker_db'),
            user: this.configService.get<string>('DB_USER', 'postgres'),
            password: this.configService.get<string>('DB_PASSWORD', ''),

            // Connection pool settings
            max: this.configService.get<number>('DB_POOL_MAX', 20),
            min: this.configService.get<number>('DB_POOL_MIN', 2),
            idleTimeoutMillis: this.configService.get<number>('DB_IDLE_TIMEOUT', 30000),
            connectionTimeoutMillis: this.configService.get<number>('DB_CONNECTION_TIMEOUT', 10000),

            // SSL configuration for production
            ssl: false,

            statement_timeout: this.configService.get<number>('DB_STATEMENT_TIMEOUT', 30000),
            query_timeout: this.configService.get<number>('DB_QUERY_TIMEOUT', 30000),
        };

        this.pool = new Pool(config);
    }

    getPool(): Pool {
        return this.pool;
    }

    async query(text: string, params?: any[]) {
        return this.pool.query(text, params);
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}
