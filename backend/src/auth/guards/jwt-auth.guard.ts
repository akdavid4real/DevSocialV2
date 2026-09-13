import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        this.logger.log(`[AUTH DEBUG] ${request.method} ${request.url} | Authorization: ${authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING'}`);
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            this.logger.warn(`[AUTH DEBUG] Guard rejection => err: ${err?.message || 'none'} | info: ${info?.message || info || 'none'}`);
            throw err || new UnauthorizedException(info?.message || 'Unauthorized');
        }
        return user;
    }
}
