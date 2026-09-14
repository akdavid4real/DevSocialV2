import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostVisibilityService } from './post-visibility.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
    imports: [PrismaModule, NotificationsModule, AuthModule],
    controllers: [PostsController],
    providers: [PostsService, PostVisibilityService, OptionalJwtAuthGuard],
    exports: [PostsService, PostVisibilityService],
})
export class PostsModule { }
