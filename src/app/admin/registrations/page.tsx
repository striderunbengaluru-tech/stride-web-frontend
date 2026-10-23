import { redirect } from 'next/navigation'

// Registrations now live under each event on the Events tab. Kept so old
// bookmarks land somewhere useful; the admin layout still gates this route.
export default function AdminRegistrationsPage() {
  redirect('/admin/events')
}
