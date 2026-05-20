export function LoginPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8 bg-gray-950">
      <div className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="2"  y="2"  width="12" height="12" rx="2.5" fill="#13B5EA" />
          <rect x="18" y="2"  width="12" height="12" rx="2.5" fill="#4B5563" />
          <rect x="2"  y="18" width="12" height="12" rx="2.5" fill="#4B5563" />
          <rect x="18" y="18" width="12" height="12" rx="2.5" fill="#4B5563" />
        </svg>
        <h1 className="text-2xl font-bold text-white tracking-tight">Personal Dashboard</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-10 py-8 flex flex-col items-center gap-5 w-80">
        <p className="text-gray-400 text-sm text-center">Sign in to access your dashboard</p>
        <a
          href="/auth/google"
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors shadow"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  )
}
