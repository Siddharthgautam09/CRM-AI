import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';


import type { BrokerageExportJobDto, TenantRecord } from './platform.types';
import { getPrismaClient } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';

const EXPORT_DIR = path.join(process.cwd(), 'storage', 'brokerage-exports');

function toDto(row: {
  id: string;
  tenantId: string;
  status: string;
  readyAt: Date | null;
  expiresAt: Date | null;
}): BrokerageExportJobDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    status: row.status as BrokerageExportJobDto['status'],
    readyAt: row.readyAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

/**
 * ponytail: this repo has no real "client records/documents" data model to
 * export yet (modules/document was removed) — the manifest packages what
 * genuinely exists (the tenant record itself) rather than fabricating a fake
 * documents store. The team roster lives in modules/auth's own database (a
 * separate service/Postgres), not this one, so pulling it in here would need
 * a real internal API call — add one if a real export needs it; noted below
 * instead of silently omitted.
 */
function buildManifest(tenant: TenantRecord): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    brokerage: tenant,
    note: 'Team roster lives in modules/auth, not exported here yet — see export.service.ts.',
  };
}

export async function startExport(tenant: TenantRecord): Promise<BrokerageExportJobDto> {
  await mkdir(EXPORT_DIR, { recursive: true });

  const job = await getPrismaClient().brokerageExportJob.create({
    data: { tenantId: tenant.id, status: 'EXPORTING' },
  });

  const filePath = path.join(EXPORT_DIR, `${job.id}.zip`);

  try {
    await writeZip(filePath, buildManifest(tenant));
    const now = new Date();
    const readyAt = now;
    const expiresAt = new Date(now.getTime() + env.platform.exportDownloadDays * 24 * 60 * 60 * 1000);

    const updated = await getPrismaClient().brokerageExportJob.update({
      where: { id: job.id },
      data: { status: 'READY', filePath, readyAt, expiresAt },
    });
    return toDto(updated);
  } catch {
    const failed = await getPrismaClient().brokerageExportJob.update({
      where: { id: job.id },
      data: { status: 'FAILED' },
    });
    return toDto(failed);
  }
}

function writeZip(filePath: string, manifest: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), { name: 'brokerage.json' });
    void archive.finalize();
  });
}

export async function getLatestExportForTenant(tenantId: string): Promise<BrokerageExportJobDto | null> {
  const row = await getPrismaClient().brokerageExportJob.findFirst({
    where: { tenantId },
    orderBy: { requestedAt: 'desc' },
  });
  return row ? toDto(row) : null;
}

export async function getDownloadPath(jobId: string): Promise<string> {
  const row = await getPrismaClient().brokerageExportJob.findUniqueOrThrow({ where: { id: jobId } });
  if (row.status !== 'READY' || !row.filePath) {
    throw new ApiError('Export is not ready for download', 409);
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    throw new ApiError('Download window has expired', 410);
  }
  await stat(row.filePath); // throws if the file was already permanently deleted
  return row.filePath;
}

/**
 * Permanently deletes export files past the retention period. No internal
 * scheduler here (matches the rest of the Gen_MS family's own convention —
 * host-triggered sweeps) — see server.ts for where this gets called on an
 * interval.
 */
export async function purgeExpiredExports(): Promise<number> {
  const cutoff = new Date(Date.now() - env.platform.exportRetentionDays * 24 * 60 * 60 * 1000);
  const expired = await getPrismaClient().brokerageExportJob.findMany({
    where: { status: 'READY', readyAt: { lt: cutoff } },
  });

  for (const job of expired) {
    if (job.filePath) {
      await rm(job.filePath, { force: true });
    }
    await getPrismaClient().brokerageExportJob.update({
      where: { id: job.id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
  return expired.length;
}
