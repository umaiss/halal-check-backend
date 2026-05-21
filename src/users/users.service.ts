import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
    constructor(private readonly databaseService: DatabaseService) { }

    async findOneByEmail(email: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.databaseService.query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async findOneById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.databaseService.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async create(user: Partial<User>): Promise<User> {
        const query = `
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at
        `;
        const result = await this.databaseService.query(query, [
            user.name,
            user.email,
            user.password,
        ]);
        return result.rows[0];
    }
}
