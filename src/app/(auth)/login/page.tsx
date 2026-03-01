import Image from 'next/image'
import { signInWithGoogle } from '@/lib/auth/actions'

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

          <form action={signInWithGoogle}>
            <button
              type='submit'
              className='w-full flex items-center justify-center gap-3 bg-white text-black cursor-pointer font-semibold text-sm px-5 py-3 rounded-md hover:bg-white/90 transition-opacity min-h-11'
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

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

function GoogleIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden='true'>
      <path
        d='M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z'
        fill='#4285F4'
      />
      <path
        d='M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z'
        fill='#34A853'
      />
      <path
        d='M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z'
        fill='#FBBC05'
      />
      <path
        d='M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z'
        fill='#EA4335'
      />
    </svg>
  )
}
