import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PrismaModule, PostsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
