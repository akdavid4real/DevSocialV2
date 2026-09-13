import { Module } from '@nestjs/common';
import { AffiliationsService } from './affiliations.service';
import { AffiliationsController } from './affiliations.controller';

@Module({
  providers: [AffiliationsService],
  controllers: [AffiliationsController]
})
export class AffiliationsModule {}
