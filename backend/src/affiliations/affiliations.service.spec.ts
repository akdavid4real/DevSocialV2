import { Test, TestingModule } from '@nestjs/testing';
import { AffiliationsService } from './affiliations.service';

describe('AffiliationsService', () => {
  let service: AffiliationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AffiliationsService],
    }).compile();

    service = module.get<AffiliationsService>(AffiliationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
