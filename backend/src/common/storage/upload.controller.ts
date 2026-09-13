import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly storageService: StorageService) { }

    @UseGuards(JwtAuthGuard)
    @Post('')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/quicktime', 'video/webm'
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Only images and videos are allowed.');
        }

        // Validate size (e.g., 20MB for videos)
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException('File too large. Max size is 20MB.');
        }

        try {
            const url = await this.storageService.uploadFile(file, 'uploads');
            return {
                success: true,
                url,
                mimetype: file.mimetype,
                size: file.size
            };
        } catch (error: any) {
            this.logger.error(`Upload controller error: ${error.message}`);
            throw new BadRequestException(error.message);
        }
    }
}
