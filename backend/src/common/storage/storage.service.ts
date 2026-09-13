import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly BUCKET_NAME = 'assets';

    constructor(private supabaseService: SupabaseService) { }

    async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
        const client = this.supabaseService.client;
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

        this.logger.log(`Uploading file to Supabase: ${fileName}`);

        const { data, error } = await client.storage
            .from(this.BUCKET_NAME)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) {
            this.logger.error(`Supabase upload error: ${error.message}`);
            throw new Error(`Upload failed: ${error.message}`);
        }

        const { data: { publicUrl } } = client.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(fileName);

        return publicUrl;
    }
}
