import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CommentRateLimitGuard implements CanActivate {
    private readonly RATE_LIMIT = 10;
    private readonly WINDOW_MS = 60000;

    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;

        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const windowStart = new Date(Date.now() - this.WINDOW_MS);

        const recentComments = await this.prisma.comment.count({
            where: {
                authorId: userId,
                createdAt: {
                    gte: windowStart,
                },
            },
        });

        if (recentComments >= this.RATE_LIMIT) {
            throw new HttpException(
                `Rate limit exceeded. Maximum ${this.RATE_LIMIT} comments per minute.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}
