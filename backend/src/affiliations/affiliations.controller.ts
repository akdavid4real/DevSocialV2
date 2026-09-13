import { Controller, Get, Logger } from '@nestjs/common';
import { AffiliationsService } from './affiliations.service';

@Controller('affiliations')
export class AffiliationsController {
    private readonly logger = new Logger(AffiliationsController.name);

    constructor(private readonly affiliationsService: AffiliationsService) { }

    @Get()
    async findAll() {
        this.logger.log('GET /affiliations - Fetching all affiliations');
        return this.affiliationsService.findAll();
    }
}
