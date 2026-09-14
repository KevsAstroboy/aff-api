import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get('file')
  @ApiOperation({
    summary: 'Lire un média (stream bytes depuis MinIO)',
    description: 'Renvoie le contenu binaire du fichier avec son content-type.',
  })
  @ApiQuery({ name: 'path', required: true, example: 'aff-uploads/publications/1/image_1.png' })
  @ApiResponse({ status: 200, description: 'Contenu du fichier' })
  @ApiResponse({ status: 400, description: 'Chemin invalide' })
  @ApiResponse({ status: 404, description: 'Fichier introuvable' })
  async file(@Query('path') path: string, @Res() res: Response) {
    if (!path || !path.includes('/')) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Chemin invalide. Format: bucket/objet',
      });
    }

    const slashIndex = path.indexOf('/');
    const bucket = path.substring(0, slashIndex);
    const objectName = path.substring(slashIndex + 1);

    try {
      const { stream, size, contentType } = await this.storage.getObjectStream(
        bucket,
        objectName,
      );
      res.setHeader('Content-Type', contentType ?? 'application/octet-stream');
      res.setHeader('Content-Length', String(size));
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + objectName.split('/').pop() + '"',
      );
      stream.pipe(res);
    } catch {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Fichier introuvable',
      });
    }
  }

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
