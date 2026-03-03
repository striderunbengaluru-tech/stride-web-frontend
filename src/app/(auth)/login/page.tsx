import Image from 'next/image'
import { GoogleSignInButton } from '@/utils/auth'

export const metadata = {
  title: 'Login — Stride Run Club',
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
            Welcome back
          </h1>
          <p className='text-white/60 text-sm text-center mb-8'>
            Sign in to your Stride account
          </p>

          <GoogleSignInButton />

          <p className='text-white/40 text-xs text-center mt-6'>
            Don&apos;t have an account?{' '}
            <a
              href='/register'
              className='text-stride-yellow-accent hover:underline'
            >
              Register here
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
