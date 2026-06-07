export function LoginPage() {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-950">

      {/* ── Left panel: feature showcase ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden bg-gradient-to-br from-gray-950 via-[#0d1628] to-[#111827] px-14 py-12">

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Decorative glow blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <AppLogo size={36} />
            <span className="text-white font-bold text-xl tracking-tight">Personal Dashboard</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-[1.2] mb-4">
            Your complete<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              life dashboard
            </span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Track finances, fitness, meals, learning and daily plans — all in one beautifully organised place.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${f.bg}`}>
                <f.Icon size={18} strokeWidth={2} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini dashboard preview cards */}
        <div className="relative z-10">
          <div className="flex gap-3">
            <PreviewCard label="Net this month" value="+€1,580" trend="up" color="#34d399" />
            <PreviewCard label="Calories today" value="1,840 kcal" trend="neutral" color="#60a5fa" />
            <PreviewCard label="Tasks done" value="3 / 5" trend="neutral" color="#a78bfa" />
          </div>
        </div>
      </div>

      {/* ── Right panel: login card ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-gray-950">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <AppLogo size={32} />
          <span className="text-white font-bold text-lg tracking-tight">Personal Dashboard</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to access your dashboard</p>

          {/* Google sign-in */}
          <a
            href="/auth/google"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg shadow-black/20 mb-3"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Demo access */}
          <a
            href="/auth/demo"
            className="w-full flex items-center justify-center gap-2 bg-gray-800/80 border border-gray-700 text-gray-200 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 hover:border-gray-600 active:scale-[0.98] transition-all"
          >
            <PlayIcon />
            Explore Demo
          </a>

          <p className="text-center text-xs text-gray-600 mt-3 leading-relaxed">
            Demo uses sample data. No account needed.
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-gray-700 mt-10">
            Your data is private and never shared.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AppLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0F172A" />
      <rect x="4"  y="4"  width="11" height="11" rx="2.5" fill="#13B5EA" />
      <rect x="17" y="4"  width="11" height="11" rx="2.5" fill="#7AA2F7" opacity=".9" />
      <rect x="4"  y="17" width="11" height="11" rx="2.5" fill="#34D399" opacity=".9" />
      <rect x="17" y="17" width="11" height="11" rx="2.5" fill="#CBA6F7" opacity=".9" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" opacity=".8" />
    </svg>
  )
}

function PreviewCard({ label, value, color }: { label: string; value: string; trend: string; color: string }) {
  return (
    <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-3">
      <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

// ── Feature data ───────────────────────────────────────────────────────────────

import { IconIncome, IconCalCheck, IconWorkout, IconBook, IconMeal, IconBell } from '../../lib/icons'

const FEATURES = [
  {
    Icon: IconIncome,
    label: 'Finance Tracking',
    desc: 'Profit & Loss, cash flow, ETF watchlist, and budget goals.',
    bg: 'bg-blue-500/10',
    color: 'text-blue-400',
  },
  {
    Icon: IconCalCheck,
    label: 'Daily Planner',
    desc: 'Tasks, journal, weekly view — stay on top of every day.',
    bg: 'bg-purple-500/10',
    color: 'text-purple-400',
  },
  {
    Icon: IconWorkout,
    label: 'Fitness & Health',
    desc: 'Log workouts, track weight, set targets and monitor progress.',
    bg: 'bg-rose-500/10',
    color: 'text-rose-400',
  },
  {
    Icon: IconMeal,
    label: 'Meal & Nutrition',
    desc: 'Calorie tracking, recipes, and smart shopping lists.',
    bg: 'bg-emerald-500/10',
    color: 'text-emerald-400',
  },
  {
    Icon: IconBook,
    label: 'Learning Hub',
    desc: 'Notes, mindmaps, vocabulary flashcards with spaced repetition.',
    bg: 'bg-amber-500/10',
    color: 'text-amber-400',
  },
  {
    Icon: IconBell,
    label: 'Reminders',
    desc: 'Never miss anything important with smart date-based alerts.',
    bg: 'bg-cyan-500/10',
    color: 'text-cyan-400',
  },
]
