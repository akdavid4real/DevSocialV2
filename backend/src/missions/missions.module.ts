import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [MissionsController],
    providers: [MissionsService],
})
export class MissionsModule {}
