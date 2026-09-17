import { requireFullAdmin } from '@/lib/auth/admin-access'
import { RacePreviewClient } from './preview-client'

export default async function RacePreviewPage() {
  // ADMIN only. The gate lives in this server component; the preview itself
  // reads sessionStorage and so can only run in the browser.
  await requireFullAdmin()

  return <RacePreviewClient />
}
