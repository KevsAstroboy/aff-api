import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const port = parseInt(this.config.getOrThrow('MINIO_PORT'), 10);
    this.client = new Minio.Client({
      endPoint: this.config.getOrThrow('MINIO_ENDPOINT'),
      port,
      accessKey: this.config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow('MINIO_SECRET_KEY'),
      useSSL,
    });
  }

  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.client.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket);
    }
  }

  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    await this.client.putObject(bucket, objectName, buffer, undefined, {
      'Content-Type': mimetype,
    });

    const useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    const endpoint = this.config.getOrThrow('MINIO_ENDPOINT');
    const port = this.config.getOrThrow('MINIO_PORT');

    return `${protocol}://${endpoint}:${port}/${bucket}/${objectName}`;
  }

  async uploadBase64(
    base64: string,
    bucket: string,
    objectName: string,
  ): Promise<string> {
    const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Format base64 invalide');
    }

    const mimetype = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new Error("L'image dépasse la taille maximale de 5 Mo");
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimetype)) {
      throw new Error(`Format d'image non supporté : ${mimetype}`);
    }

    return this.uploadFile(bucket, objectName, buffer, mimetype);
  }

  async getPresignedUrl(
    bucket: string,
    objectName: string,
    expirySeconds = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }

  async deleteFile(bucket: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }
}
