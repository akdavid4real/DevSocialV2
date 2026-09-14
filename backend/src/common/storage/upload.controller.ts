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
        if (!ALLOWED_TYPES.has(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Only supported images and videos are allowed.');
        }
        if (file.size > MAX_UPLOAD_SIZE) {
            throw new BadRequestException('File too large. Max size is 20MB.');
        }
        if (!this.matchesFileSignature(file.buffer, file.mimetype)) {
            throw new BadRequestException('File content does not match its declared type');
        }

        try {
            const url = await this.storageService.uploadFile(file, 'uploads', req.user.id);
            return {
                success: true,
                url,
                mimetype: file.mimetype,
                size: file.size,
            };
        } catch (error: any) {
            this.logger.error(`Upload controller error: ${error.message}`);
            throw new BadRequestException('Upload failed');
        }
    }

    private matchesFileSignature(buffer: Buffer, mimetype: string) {
        if (!buffer || buffer.length < 12) return false;

        if (mimetype === 'image/jpeg') {
            return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        }
        if (mimetype === 'image/png') {
            return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        }
        if (mimetype === 'image/gif') {
            const header = buffer.subarray(0, 6).toString('ascii');
            return header === 'GIF87a' || header === 'GIF89a';
        }
        if (mimetype === 'image/webp') {
            return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
                && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
        }
        if (mimetype === 'video/webm') {
            return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        }
        if (mimetype === 'video/mp4' || mimetype === 'video/quicktime') {
            return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
        }

        return false;
    }
}
