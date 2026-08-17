import { requireFullAdmin } from '@/lib/auth/admin-access'
import { EventPreviewClient } from './preview-client'

export default async function EventPreviewPage() {
  // ADMIN only. A LEAD reaching this route is redirected to check-in.
  //
  // The gate has to live in a server component, which is why the preview itself
  // was split into preview-client.tsx: it reads its payload from
  // sessionStorage and so cannot run anywhere but the browser.
  await requireFullAdmin()

  return <EventPreviewClient />
}
