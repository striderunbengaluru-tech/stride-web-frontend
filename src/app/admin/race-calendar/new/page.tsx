import { RaceForm } from '@/components/admin/race-form'
import { createRaceAction } from '@/lib/actions/admin-races'
import { requireFullAdmin } from '@/lib/auth/admin-access'

export const metadata = { title: 'New Race — Admin' }

export default async function NewRacePage() {
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  await requireFullAdmin()

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-6'>New Race</h1>
      <RaceForm action={createRaceAction} submitLabel='Create Race' />
    </div>
  )
}
