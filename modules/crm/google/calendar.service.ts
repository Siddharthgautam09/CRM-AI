import { google } from 'googleapis';

import { getAuthenticatedClientOrNull } from './google-connection.service';
import { getPrismaClient } from '../../../config/database';
import { ApiError } from '../../../utils/api-error';

export interface CreateAppointmentInput {
  title: string;
  startTime: string;
  endTime: string;
  leadId?: string;
  attendeeEmails?: string[];
}

/**
 * "New appointment" (Flow 4.8): Google Calendar connected? No -> stays in
 * the CRM only. Yes -> pushed across. This pushes synchronously rather than
 * queuing — "queued and retried quietly" on a real failure is a background-
 * job system this CRM doesn't have; a failed push here just leaves
 * googleEventId null, same end state as never having connected.
 */
export async function createAppointment(
  tenantId: string,
  brokerUserId: string,
  input: CreateAppointmentInput,
) {
  const appointment = await getPrismaClient().appointment.create({
    data: {
      tenantId,
      brokerUserId,
      leadId: input.leadId,
      title: input.title,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
    },
  });

  const connection = await getAuthenticatedClientOrNull(brokerUserId);
  if (!connection) {
    return { ...appointment, pushedToGoogle: false };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: connection.client });
    const { data: event } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: input.title,
        start: { dateTime: appointment.startTime.toISOString() },
        end: { dateTime: appointment.endTime.toISOString() },
        attendees: input.attendeeEmails?.map((email) => ({ email })),
      },
    });
    const updated = await getPrismaClient().appointment.update({
      where: { id: appointment.id },
      data: { googleEventId: event.id },
    });
    return { ...updated, pushedToGoogle: true };
  } catch {
    // Matches the diagram's "stays in CRM only, with a prompt to connect" end
    // state — the appointment row already exists either way.
    return { ...appointment, pushedToGoogle: false };
  }
}

export async function listMyAppointments(tenantId: string, brokerUserId: string) {
  return getPrismaClient().appointment.findMany({
    where: { tenantId, brokerUserId },
    orderBy: { startTime: 'asc' },
  });
}

/** "Team calendar" — the one piece Flow 3 was missing. */
export async function listForBrokers(tenantId: string, brokerIds: string[]) {
  if (brokerIds.length === 0) return [];
  return getPrismaClient().appointment.findMany({
    where: { tenantId, brokerUserId: { in: brokerIds } },
    orderBy: { startTime: 'asc' },
  });
}

export async function requireOwnAppointment(
  tenantId: string,
  brokerUserId: string,
  appointmentId: string,
) {
  const appointment = await getPrismaClient().appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment || appointment.tenantId !== tenantId) {
    throw new ApiError('Appointment not found', 404);
  }
  if (appointment.brokerUserId !== brokerUserId) {
    throw new ApiError("You don't have access to this record", 403);
  }
  return appointment;
}
