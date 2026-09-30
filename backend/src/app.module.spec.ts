import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import { SupabaseService } from './common/supabase/supabase.service';

describe('Application startup dependencies', () => {
  it('resolves every module and controller guard without external services', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SupabaseService)
      .useValue({})
      .compile();

    await module.close();
  });
});
