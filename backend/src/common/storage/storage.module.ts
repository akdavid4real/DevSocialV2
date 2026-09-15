import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { UploadController } from './upload.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [SupabaseModule, PrismaModule],
    controllers: [UploadController],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule { }
