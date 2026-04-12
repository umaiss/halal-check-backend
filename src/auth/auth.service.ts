import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly databaseService: DatabaseService,
        private readonly jwtService: JwtService,
    ) { }

    async signup(signupDto: SignupDto) {
        // ... (preserving existing signup logic)
        try {
            const { name, email, password } = signupDto;
            const existingUser = await this.usersService.findOneByEmail(email);
            if (existingUser) {
                throw new ConflictException('Email already in use');
            }
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(password, salt);
            const newUser = await this.usersService.create({
                name,
                email,
                password: hashedPassword,
            });
            console.log('User created successfully:', newUser.id);
            try {
                const payload = { sub: newUser.id, email: newUser.email };
                const token = await this.jwtService.signAsync(payload);
                console.log('JWT generated successfully');
                return {
                    message: 'User registered successfully',
                    user: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                    },
                    access_token: token,
                };
            } catch (jwtError) {
                console.error('JWT Signing Error:', jwtError);
                throw jwtError;
            }
        } catch (error) {
            console.error('Signup Error:', error);
            throw error;
        }
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // 1. Find user by email
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 2. Compare passwords
        const isPasswordMatching = await bcrypt.compare(password, user.password as string);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 3. Generate JWT token
        const payload = { sub: user.id, email: user.email };
        const token = await this.jwtService.signAsync(payload);

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            access_token: token,
        };
    }

    async adminLogin(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // 1. Find admin user by email directly from DB (includes role column)
        const result = await this.databaseService.query(
            'SELECT * FROM admin_users WHERE email = $1',
            [email]
        );
        const adminUser = result.rows[0];

        if (!adminUser) {
            throw new UnauthorizedException('Invalid admin email or password');
        }

        // 2. Compare passwords
        const isPasswordMatching = await bcrypt.compare(password, adminUser.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('Invalid admin email or password');
        }

        // 3. Generate JWT token with the actual role from DB (admin | assignee)
        const payload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
        const token = await this.jwtService.signAsync(payload);

        return {
            message: 'Admin login successful',
            user: {
                id: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
            },
            access_token: token,
        };
    }

    async logout() {
        return {
            message: 'Logout successful',
        };
    }
}
