import { getTenantPeople } from './modauth.client';
import { getPrismaClient } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import * as exportService from '../platform/export.service';

export interface TenantProfileInput {
  displayName?: string;
  supportEmail?: string;
  phone?: string;
  address?: string;
}

/** Brokerage profile — Tenant Admin's own settings screen (Flow 2). */
export async function getProfile(tenantId: string) {
  return (
    (await getPrismaClient().tenantProfile.findUnique({ where: { tenantId } })) ?? {
      tenantId,
      displayName: null,
      supportEmail: null,
      phone: null,
      address: null,
      updatedAt: null,
    }
  );
}

export async function updateProfile(tenantId: string, input: TenantProfileInput) {
  return getPrismaClient().tenantProfile.upsert({
    where: { tenantId },
    create: { tenantId, ...input },
    update: input,
  });
}

export interface BookingSettingsInput {
  slug?: string;
  enabled?: boolean;
  bufferMinutes?: number;
}

/**
 * Booking page setup — settings/config only (per the agreed scope): a
 * slug, on/off, and a buffer. No public scheduling/availability engine.
 */
export async function getBookingSettings(tenantId: string) {
  return (
    (await getPrismaClient().bookingPageSettings.findUnique({ where: { tenantId } })) ?? {
      tenantId,
      slug: null,
      enabled: false,
      bufferMinutes: 15,
      updatedAt: null,
    }
  );
}

export async function updateBookingSettings(tenantId: string, input: BookingSettingsInput) {
  if (input.slug) {
    const existing = await getPrismaClient().bookingPageSettings.findUnique({
      where: { slug: input.slug },
    });
    if (existing && existing.tenantId !== tenantId) {
      throw new ApiError('That booking page slug is already taken', 409);
    }
  }
  const current = await getPrismaClient().bookingPageSettings.findUnique({ where: { tenantId } });
  if (!current && !input.slug) {
    throw new ApiError('A slug is required to set up the booking page', 400);
  }
  return getPrismaClient().bookingPageSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      slug: input.slug!,
      enabled: input.enabled ?? false,
      bufferMinutes: input.bufferMinutes ?? 15,
    },
    update: input,
  });
}

/** "Every lead and client across the brokerage" — Tenant Admin only, no team filter. */
export async function tenantWideBook(tenantId: string, callerBearerToken: string) {
  const people = await getTenantPeople(callerBearerToken);
  const brokerIds = people.map((p) => p.userId);
  if (brokerIds.length === 0) return [];
  return getPrismaClient().lead.findMany({
    where: { tenantId, brokerUserId: { in: brokerIds } },
    orderBy: { createdAt: 'desc' },
  });
}

/** "Export all our data" — Tenant Admin's self-service counterpart of the Super Admin's cancellation export. */
export async function startSelfServiceExport(tenantId: string) {
  return exportService.startSelfServiceExport(tenantId);
}

export async function getExportStatus(tenantId: string) {
  return exportService.getLatestExportForTenant(tenantId);
}

export async function getExportDownloadPath(tenantId: string, jobId: string) {
  const latest = await getExportStatus(tenantId);
  if (!latest || latest.id !== jobId) {
    throw new ApiError("Not your brokerage's export", 403);
  }
  return exportService.getDownloadPath(jobId);
}
