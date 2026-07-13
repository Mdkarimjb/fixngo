import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { diskStorage } from 'multer';

export const uploadDirectory = join(process.cwd(), 'uploads');
mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const imageUploadOptions = {
  storage: diskStorage({
    destination: uploadDirectory,
    filename: (
      _request: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      callback(null, `${randomUUID()}${extensions[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(
        new BadRequestException('Only JPEG, PNG and WebP images are allowed'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

export function imageUrls(files: Express.Multer.File[] | undefined): string[] {
  return (files ?? []).map((file) => `/api/uploads/${file.filename}`);
}
