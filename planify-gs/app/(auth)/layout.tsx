export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ background: '#0a0a12' }}
      className="min-h-screen flex items-center justify-center overflow-hidden relative"
    >
      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,77,109,.13) 0%, transparent 70%)',
            animation: 'splOrb 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(76,201,240,.07) 0%, transparent 70%)',
            animation: 'splOrb 11s 2s ease-in-out infinite reverse',
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(rgba(255,255,255,.015) 0px, rgba(255,255,255,.015) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, rgba(255,255,255,.015) 0px, rgba(255,255,255,.015) 1px, transparent 1px, transparent 60px)',
          }}
        />
      </div>

      {children}

      <style>{`
        @keyframes splOrb {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-30px) translateX(-50%); }
        }
        @keyframes splFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes splLogoIn {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
