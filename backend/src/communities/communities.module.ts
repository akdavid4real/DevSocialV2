import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';

@Module({
    imports: [PrismaModule, PostsModule],
    controllers: [CommunitiesController],
    providers: [CommunitiesService],
})
export class CommunitiesModule {}
