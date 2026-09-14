import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MobilePushService } from './mobile-push.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MobilePushService],
  exports: [NotificationsService, MobilePushService],
})
export class NotificationsModule {}
