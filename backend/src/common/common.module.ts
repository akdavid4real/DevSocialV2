import { Global, Module } from '@nestjs/common';
import { LinkPreviewController } from './link-preview.controller';
import { SocialUtilsService } from './social-utils.service';

@Global()
@Module({
  controllers: [LinkPreviewController],
  providers: [SocialUtilsService],
  exports: [SocialUtilsService],
})
export class CommonModule {}
