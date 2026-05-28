import Image from 'next/image'
import { GoogleSignInButton } from '@/utils/auth'

export const metadata = {
  title: 'Sign In — Stride Run Club',
}

export default function LoginPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary flex items-center justify-center px-4 py-24'>
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='flex justify-center mb-10'>
          <Image
            src='/assets/images/stride-logo-full.webp'
            alt='Stride Run Club'
            width={140}
            height={46}
            priority
          />
        </div>

        {/* Card */}
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8 hover:border-stride-yellow-accent/50 transition-colors'>
          <h1 className='text-2xl font-bold text-white text-center mb-2'>
            Welcome to Stride
          </h1>
          <p className='text-white/60 text-sm text-center mb-8'>
            Sign in or create your account — it&apos;s the same button.
          </p>

          <GoogleSignInButton />

          <p className='text-white/30 text-xs text-center mt-6 leading-relaxed'>
            By continuing, you agree to our{' '}
            <a href='/terms-of-service' className='text-stride-yellow-accent hover:underline'>
              Terms
            </a>{' '}
            and{' '}
            <a href='/privacy-policy' className='text-stride-yellow-accent hover:underline'>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
