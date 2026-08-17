import { EventForm } from '@/components/admin/event-form'
import { createEventAction } from '@/lib/actions/admin'
import { requireFullAdmin } from '@/lib/auth/admin-access'

export const metadata = { title: 'New Event — Admin' }

export default async function NewEventPage(){
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>New Event</h1>
      {/* Rejections (duplicate slug, validation) come back through
          useActionState inside EventForm rather than a ?slug_error redirect, so
          there is no searchParams plumbing here any more — and a rejected save
          no longer discards the admin's unsaved markdown and banner uploads. */}
      <EventForm
        action={createEventAction}
        submitLabel='Create Event'
      />
    </div>
  )
}
