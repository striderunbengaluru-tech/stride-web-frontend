import { EventForm } from '@/components/admin/event-form'
import { createEventAction } from '@/lib/actions/admin'

export const metadata = { title: 'New Event — Admin' }

type Props = { searchParams: Promise<{ slug_error?: string }> }

export default async function NewEventPage({ searchParams }: Props) {
  const { slug_error } = await searchParams

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>New Event</h1>
      <EventForm
        action={createEventAction}
        submitLabel='Create Event'
        errorMessage={slug_error}
      />
    </div>
  )
}
