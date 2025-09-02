import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { LOG_DIR } from '@/shopee/constants';

export async function ensureLogsDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
  }
}