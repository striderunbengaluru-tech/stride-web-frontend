'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { SAVE_NOTICE_PARAM, SAVE_NOTICES, isSaveNotice } from '@/lib/admin/save-notice'

/**
 * Shows the success toast a save action asked for (see lib/admin/save-notice),
 * then strips the key from the URL so a refresh or a shared link doesn't show
 * it again.
 */
export function AdminSaveToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const notice = searchParams.get(SAVE_NOTICE_PARAM)

  useEffect(() => {
    if (!isSaveNotice(notice)) return
    toast.success(SAVE_NOTICES[notice])

    const rest = new URLSearchParams(searchParams.toString())
    rest.delete(SAVE_NOTICE_PARAM)
    const query = rest.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [notice, pathname, router, searchParams])

  return null
}
