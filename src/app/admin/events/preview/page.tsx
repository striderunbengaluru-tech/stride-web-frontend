import { requireEventsAccess } from '@/lib/auth/admin-access'
import { EventPreviewClient } from './preview-client'

export default async function EventPreviewPage() {
  // ADMIN or LEAD. The preview renders only what the viewer's own open form
  // put in sessionStorage, so it reads no event data of its own.
  //
  // The gate has to live in a server component, which is why the preview itself
  // was split into preview-client.tsx: it reads its payload from
  // sessionStorage and so cannot run anywhere but the browser.
  await requireEventsAccess()

  return <EventPreviewClient />
}
