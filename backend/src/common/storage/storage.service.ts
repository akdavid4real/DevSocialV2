import { randomUUID } from 'crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
};

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

type AssetRow = {
    id: string;
    owner_id: string;
    bucket: string;
    object_key: string;
    public_url: string;
    mime_type: string;
    size_bytes: number;
    status: 'UPLOADED' | 'ATTACHED' | 'DELETED';
};

export type StoredAsset = {
    assetId: string;
    url: string;
    objectKey: string;
    bucket: string;
    mimetype: string;
    size: number;
};

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(StorageService.name);
    private readonly BUCKET_NAME = 'assets';
    private cleanupTimer?: ReturnType<typeof setInterval>;

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly prisma: PrismaService,
    ) {}

    onModuleInit() {
        this.cleanupTimer = setInterval(() => {
            void this.cleanupOrphanAssets().catch((error) => {
                this.logger.warn(`Orphan asset cleanup failed: ${error?.message || error}`);
            });
        }, CLEANUP_INTERVAL_MS);
        this.cleanupTimer.unref?.();
    }

    onModuleDestroy() {
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'general',
        ownerId: string = 'system',
    ): Promise<StoredAsset> {
        const client = this.supabaseService.client;
        const extension = EXTENSION_BY_MIME[file.mimetype];
        if (!extension) throw new Error('Unsupported file type');

        const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
        const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '');
        const objectKey = `${safeFolder}/${safeOwner}/${Date.now()}-${randomUUID()}.${extension}`;

        const { error } = await client.storage
            .from(this.BUCKET_NAME)
            .upload(objectKey, file.buffer, {
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
            .getPublicUrl(objectKey);

        try {
            const rows = await this.prisma.$queryRaw<AssetRow[]>`
                INSERT INTO public.assets
                    (owner_id, provider, bucket, object_key, public_url, mime_type, size_bytes, status)
                VALUES
                    (${ownerId}::uuid, 'SUPABASE', ${this.BUCKET_NAME}, ${objectKey}, ${publicUrl}, ${file.mimetype}, ${file.size}, 'UPLOADED')
                RETURNING id, owner_id, bucket, object_key, public_url, mime_type, size_bytes, status
            `;
            const asset = rows[0];
            return {
                assetId: asset.id,
                url: asset.public_url,
                objectKey: asset.object_key,
                bucket: asset.bucket,
                mimetype: asset.mime_type,
                size: asset.size_bytes,
            };
        } catch (dbError: any) {
            await client.storage.from(this.BUCKET_NAME).remove([objectKey]);
            this.logger.error(`Asset metadata write failed: ${dbError?.message || dbError}`);
            throw new Error('Upload could not be recorded safely');
        }
    }

    async markAttachedByUrls(
        ownerId: string,
        urls: string[],
        attachedToType: string,
        attachedToId: string,
    ) {
        const uniqueUrls = [...new Set(urls.filter(Boolean))];
        if (uniqueUrls.length === 0) return;

        await this.prisma.$executeRaw`
            UPDATE public.assets
            SET status = 'ATTACHED',
                attached_to_type = ${attachedToType},
                attached_to_id = ${attachedToId}::uuid,
                attached_at = COALESCE(attached_at, now())
            WHERE owner_id = ${ownerId}::uuid
              AND public_url = ANY(${uniqueUrls}::text[])
              AND status <> 'DELETED'
        `;
    }

    async detachAttachment(attachedToType: string, attachedToId: string) {
        await this.prisma.$executeRaw`
            UPDATE public.assets
            SET status = 'UPLOADED',
                attached_to_type = NULL,
                attached_to_id = NULL,
                attached_at = NULL
            WHERE attached_to_type = ${attachedToType}
              AND attached_to_id = ${attachedToId}::uuid
              AND status = 'ATTACHED'
        `;
    }

    async cleanupOrphanAssets(limit = 100) {
        const safeLimit = Math.min(Math.max(limit || 100, 1), 500);
        const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);
        const assets = await this.prisma.$queryRaw<AssetRow[]>`
            SELECT id, owner_id, bucket, object_key, public_url, mime_type, size_bytes, status
            FROM public.assets
            WHERE status = 'UPLOADED'
              AND created_at < ${cutoff}
            ORDER BY created_at ASC
            LIMIT ${safeLimit}
        `;

        if (assets.length === 0) return { removed: 0 };

        const client = this.supabaseService.client;
        let removed = 0;
        for (const asset of assets) {
            const { error } = await client.storage.from(asset.bucket).remove([asset.object_key]);
            if (error) {
                this.logger.warn(`Failed to remove orphan asset ${asset.id}: ${error.message}`);
                continue;
            }
            await this.prisma.$executeRaw`
                UPDATE public.assets
                SET status = 'DELETED', deleted_at = now()
                WHERE id = ${asset.id}::uuid AND status = 'UPLOADED'
            `;
            removed += 1;
        }

        if (removed > 0) this.logger.log(`Removed ${removed} orphaned uploads`);
        return { removed };
    }
}
