import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto, AppleLoginDto } from './dto/social-login.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { verifyIdToken as verifyAppleIdToken } from 'apple-signin-auth';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly databaseService: DatabaseService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    private async generateTokens(userId: number, email: string) {
        const payload = { sub: userId, email };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
        });

        const refreshToken = await this.jwtService.signAsync({ sub: userId }, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'super-secret-refresh-key-change-this-in-production',
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '60d') as any,
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

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
                const tokens = await this.generateTokens(newUser.id, newUser.email);
                console.log('JWT and Refresh token generated successfully');
                return {
                    message: 'User registered successfully',
                    user: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                    },
                    ...tokens,
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

        // 3. Generate JWT token and refresh token
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            ...tokens,
        };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw new BadRequestException('Refresh token is required');
        }
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'super-secret-refresh-key-change-this-in-production',
            });

            const user = await this.usersService.findOneById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const tokens = await this.generateTokens(user.id, user.email);

            return {
                message: 'Token refreshed successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
                ...tokens,
            };
        } catch (error) {
            console.error('Refresh Token Error:', error);
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
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
        const token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
        });

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

    async googleLogin(googleLoginDto: GoogleLoginDto) {
        const { idToken } = googleLoginDto;
        const webClientId = this.configService.get<string>('GOOGLE_WEB_CLIENT_ID');
        if (!webClientId) {
            throw new BadRequestException('Google configuration (GOOGLE_WEB_CLIENT_ID) is missing on the server');
        }

        let email: string;
        let name: string;

        try {
            const client = new OAuth2Client(webClientId);
            const ticket = await client.verifyIdToken({
                idToken,
                audience: webClientId,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new UnauthorizedException('Invalid Google token payload');
            }
            email = payload.email;
            name = payload.name || payload.email.split('@')[0];
        } catch (error) {
            console.error('Google token verification failed:', error);
            throw new UnauthorizedException('Invalid Google ID Token');
        }

        // Find or create user
        let user = await this.usersService.findOneByEmail(email);
        if (!user) {
            const randomPassword = randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(randomPassword, salt);
            
            user = await this.usersService.create({
                name,
                email,
                password: hashedPassword,
            });
        }

        const tokens = await this.generateTokens(user.id, user.email);

        return {
            message: 'Google login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            ...tokens,
        };
    }

    async appleLogin(appleLoginDto: AppleLoginDto) {
        const { identityToken, name: inputName, email: inputEmail } = appleLoginDto;
        const appleClientId = this.configService.get<string>('APPLE_CLIENT_ID');
        if (!appleClientId) {
            throw new BadRequestException('Apple configuration (APPLE_CLIENT_ID) is missing on the server');
        }

        let email: string;

        try {
            const verifiedToken = await verifyAppleIdToken(identityToken, {
                audience: appleClientId,
                ignoreExpiration: false,
            });

            if (!verifiedToken || !verifiedToken.email) {
                throw new UnauthorizedException('Invalid Apple token payload');
            }
            email = verifiedToken.email;
        } catch (error) {
            console.error('Apple token verification failed:', error);
            throw new UnauthorizedException('Invalid Apple Identity Token');
        }

        // Find or create user
        let user = await this.usersService.findOneByEmail(email);
        if (!user) {
            // Apple only provides user profile (name/email) on the FIRST login.
            // If they signed in before and removed the app, the client might pass inputName/inputEmail.
            const name = inputName || email.split('@')[0];
            
            const randomPassword = randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await this.usersService.create({
                name,
                email,
                password: hashedPassword,
            });
        }

        const tokens = await this.generateTokens(user.id, user.email);

        return {
            message: 'Apple login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            ...tokens,
        };
    }
}
