import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'devsocial-default-secret',
        });
    }

    async validate(payload: any) {
        this.logger.log(`Validating JWT payload: ${JSON.stringify(payload)}`);

        if (!payload.sub) {
            this.logger.warn('Token payload missing "sub" field');
            throw new UnauthorizedException('Invalid token payload');
        }

        try {
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                this.logger.warn(`User with ID ${payload.sub} not found in database`);
                throw new UnauthorizedException('User not found');
            }

            if (user.isBlocked) {
                this.logger.warn(`User ${user.username} is blocked`);
                throw new UnauthorizedException('User is blocked');
            }

            this.logger.log(`✓ Authenticated as: ${user.username} (ID: ${user.id}, Email: ${user.email})`);
            return user;
        } catch (error) {
            this.logger.error(`Error during user validation: ${error.message}`);
            throw new UnauthorizedException('Authentication failed');
        }
    }
}
