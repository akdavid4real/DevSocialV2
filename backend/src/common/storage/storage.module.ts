import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { UploadController } from './upload.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [UploadController],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule { }
