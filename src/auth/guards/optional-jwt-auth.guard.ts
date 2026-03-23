import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Override handleRequest to not throw an error if the user is not authenticated
    handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
        return user;
    }
}
