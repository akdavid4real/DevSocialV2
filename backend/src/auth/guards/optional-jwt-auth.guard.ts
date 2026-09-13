import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Override handleRequest to not throw an error if no token is provided
    handleRequest(err: any, user: any) {
        // If there's an error or no user, just return null (don't throw)
        if (err || !user) {
            return null;
        }
        return user;
    }

    // Override canActivate to always return true
    canActivate(context: ExecutionContext) {
        // Always allow the request to proceed
        return super.canActivate(context) as Promise<boolean> | boolean;
    }
}
