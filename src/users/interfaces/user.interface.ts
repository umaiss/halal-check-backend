export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    created_at?: Date;
    reset_code?: string;
    reset_code_expires_at?: Date;
}
