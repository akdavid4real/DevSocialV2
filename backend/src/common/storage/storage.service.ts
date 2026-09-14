import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
};

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly BUCKET_NAME = 'assets';

    constructor(private supabaseService: SupabaseService) {}

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'general',
        ownerId: string = 'system',
    ): Promise<string> {
        const client = this.supabaseService.client;
        const extension = EXTENSION_BY_MIME[file.mimetype];
        if (!extension) throw new Error('Unsupported file type');

        const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
        const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `${safeFolder}/${safeOwner}/${Date.now()}-${randomUUID()}.${extension}`;

        const { error } = await client.storage
            .from(this.BUCKET_NAME)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
                cacheControl: '31536000',
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
