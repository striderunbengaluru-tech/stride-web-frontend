import { EventForm } from '@/components/admin/event-form'
import { createEventAction } from '@/lib/actions/admin'

export const metadata = { title: 'New Event — Admin' }

export default function NewEventPage() {
  return (
    <div className='max-w-2xl'>
      <h1 className='text-3xl font-bold text-white mb-8'>New Event</h1>
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8'>
        <EventForm action={createEventAction} submitLabel='Create Event' />
      </div>
    </div>
  )
}
