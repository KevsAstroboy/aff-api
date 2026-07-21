import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get('preview')
  @ApiOperation({
    summary: 'Preview media via URL présignée MinIO',
    description: 'Redirige vers une URL présignée temporaire (valide 1h).',
  })
  @ApiQuery({ name: 'path', required: true, example: 'aff-uploads/publications/1/image_1.png' })
  @ApiResponse({ status: 302, description: 'Redirection vers URL présignée' })
  @ApiResponse({ status: 400, description: 'Chemin invalide' })
  async preview(@Query('path') path: string, @Res() res: Response) {
    if (!path || !path.includes('/')) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Chemin invalide. Format: bucket/objet',
      });
    }

    const slashIndex = path.indexOf('/');
    const bucket = path.substring(0, slashIndex);
    const objectName = path.substring(slashIndex + 1);

    const url = await this.storage.getPresignedUrl(bucket, objectName, 3600);
    res.redirect(url);
  }
}
