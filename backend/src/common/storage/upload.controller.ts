import {
    BadRequestException,
    Controller,
    Logger,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
]);

@Controller('upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly storageService: StorageService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            files: 1,
            fileSize: MAX_UPLOAD_SIZE,
        },
    }))
    async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        if (file.size > MAX_UPLOAD_SIZE) throw new BadRequestException('File too large. Max size is 20MB.');

        const detectedMime = this.detectMime(file.buffer);
        if (!detectedMime || !ALLOWED_TYPES.has(detectedMime)) {
            throw new BadRequestException('Unsupported or invalid file content');
        }

        const normalizedFile: Express.Multer.File = {
            ...file,
            mimetype: detectedMime,
        };

        try {
            const asset = await this.storageService.uploadFile(normalizedFile, 'uploads', req.user.id);
            return {
                success: true,
                assetId: asset.assetId,
                url: asset.url,
                objectKey: asset.objectKey,
                bucket: asset.bucket,
                mimetype: asset.mimetype,
                size: asset.size,
            };
        } catch (error: any) {
            this.logger.error(`Upload controller error: ${error.message}`);
            throw new BadRequestException('Upload failed');
        }
    }

    private detectMime(buffer: Buffer): string | null {
        if (!buffer || buffer.length < 12) return null;

        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return 'image/jpeg';
        }
        if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
            return 'image/png';
        }
        const gifHeader = buffer.subarray(0, 6).toString('ascii');
        if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
            return 'image/gif';
        }
        if (
            buffer.subarray(0, 4).toString('ascii') === 'RIFF'
            && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        ) {
            return 'image/webp';
        }
        if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
            return 'video/webm';
        }
        if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
            const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
            if (brand.includes('qt')) return 'video/quicktime';
            return 'video/mp4';
        }

        return null;
    }
}
