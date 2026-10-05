import { adminClient } from '@/lib/supabase/admin'
import { collectSpotHolds, type SpotHold, type SpotHoldRow } from '@/lib/events/package-spots'

/**
 * Every registration on the event that currently holds a spot, as the package
 * ids it bought. Server-only: reads through adminClient, so callers must have
 * verified the admin role first.
 *
 * Includes registrations with no packages at all — they still count against
 * capacity, so they are retired spots as far as the package budgets go.
 */
export async function getSpotHolds(eventId: string): Promise<SpotHold[]> {
  const { data } = await adminClient
    .from('event_registrations')
    .select('status, created_at, selected_packages')
    .eq('event_id', eventId)
    .in('status', ['CONFIRMED', 'PENDING'])

  return collectSpotHolds((data ?? []) as SpotHoldRow[])
}
