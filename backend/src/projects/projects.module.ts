import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [ProjectsController],
    providers: [ProjectsService, OptionalJwtAuthGuard],
})
export class ProjectsModule {}
