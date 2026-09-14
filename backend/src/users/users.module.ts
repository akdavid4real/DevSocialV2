import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
  imports: [PrismaModule, PostsModule, AuthModule],
  providers: [UsersService, OptionalJwtAuthGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
