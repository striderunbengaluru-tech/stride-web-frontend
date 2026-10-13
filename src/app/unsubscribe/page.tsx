import type { Metadata } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { UNSUBSCRIBE_TOKEN_LENGTH, verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'

// Confirmation step for the unsubscribe link in promo emails. The link lands on
// GET /api/email/unsubscribe, which redirects here without changing anything
// (link scanners GET every URL in an email — see that route). The button below
// is the actual unsubscribe: a plain form POST back to the route, which then
// redirects to `?done=1`.
//
// Kept out of search and AI discovery: noindex here, Disallow in robots.txt, and
// deliberately absent from llms.txt and the sitemap. The page is meaningless
// without a personal link.

export const metadata: Metadata = {
  title: 'Unsubscribe — Stride Run Club',
  description: 'Manage Stride marketing emails.',
  robots: { index: false, follow: false },
}

const ParamsSchema = z.object({
  u: z.string().min(1).max(128),
  t: z.string().regex(new RegExp(`^[0-9a-f]{${UNSUBSCRIBE_TOKEN_LENGTH}}$`)),
})

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type View =
  | { kind: 'done' }
  | { kind: 'confirm'; action: string }
  | { kind: 'invalid' }

function resolveView(params: Record<string, string | string[] | undefined>): View {
  if (params.done === '1') return { kind: 'done' }

  const parsed = ParamsSchema.safeParse({ u: params.u, t: params.t })
  if (!parsed.success || !verifyUnsubscribeToken(parsed.data.u, parsed.data.t)) {
    return { kind: 'invalid' }
  }

  const query = new URLSearchParams({ u: parsed.data.u, t: parsed.data.t })
  return { kind: 'confirm', action: `/api/email/unsubscribe?${query.toString()}` }
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const view = resolveView(await searchParams)

  return (
    <main className='min-h-screen bg-stride-purple-primary px-4 pt-28 pb-24'>
      <section className='mx-auto max-w-md bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-5 py-6 sm:px-6'>
        {view.kind === 'done' && (
          <>
            <h1 className='font-libre text-2xl font-bold text-white'>You&apos;re unsubscribed</h1>
            <p className='mt-3 text-sm leading-relaxed text-white/70'>
              We won&apos;t email you about other Stride runs or partner events. You&apos;ll still
              get emails about runs you register for. Changed your mind? Switch &ldquo;Event
              emails&rdquo; back on from your profile.
            </p>
          </>
        )}

        {view.kind === 'confirm' && (
          <>
            <h1 className='font-libre text-2xl font-bold text-white'>Unsubscribe from Stride emails?</h1>
            <p className='mt-3 text-sm leading-relaxed text-white/70'>
              You&apos;ll stop getting emails about other Stride runs and partner events. Emails
              about runs you register for will still reach you.
            </p>
            <form method='post' action={view.action} className='mt-6'>
              <input type='hidden' name='from' value='page' />
              <button
                type='submit'
                className='w-full min-h-11 rounded-md bg-stride-yellow-accent text-copy-black text-sm font-bold hover:bg-stride-yellow-accent/90 transition-colors'
              >
                Unsubscribe
              </button>
            </form>
          </>
        )}

        {view.kind === 'invalid' && (
          <>
            <h1 className='font-libre text-2xl font-bold text-white'>This link isn&apos;t valid</h1>
            <p className='mt-3 text-sm leading-relaxed text-white/70'>
              Please use the unsubscribe link in your most recent Stride email, or{' '}
              <Link href='/contact-us' className='text-stride-yellow-accent hover:underline underline-offset-2'>
                contact us
              </Link>{' '}
              and we&apos;ll take you off the list.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
