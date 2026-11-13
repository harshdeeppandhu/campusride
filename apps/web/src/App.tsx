import { BRAND, MemberType, TrustTier, SAFETY_COPY } from '@campusride/shared';

export default function App() {
  const memberTypes = Object.values(MemberType);
  const tiers = Object.entries(TrustTier);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Ambient glowing gradient orbs for frosted glass backdrop */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-sky-300/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main GlassUI Container */}
      <main className="relative z-10 w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-10 transition-all">
        {/* Header with Glass Pill */}
        <header className="flex flex-col items-start sm:items-center text-left sm:text-center mb-8">
          <div className="glass-pill px-4 py-1.5 rounded-full text-xs font-semibold text-primary-700 tracking-wide uppercase mb-3 inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            GlassUI Activated · M0 Foundation
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
            {BRAND.name}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-medium max-w-md">
            {BRAND.tagline}
          </p>
        </header>

        {/* Feature Cards Grid (Glass Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Card 1: Trust Tiers */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" role="img" aria-label="Shield">
                🛡️
              </span>
              <h2 className="font-semibold text-slate-900 text-sm">
                Trust Tier Gating (docs/05)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Server-computed privilege levels gating browse, book, and ride offering.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tiers.map(([name, level]) => (
                <span
                  key={name}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/70 text-slate-800 border border-white/80 shadow-sm"
                >
                  {name} (T{level})
                </span>
              ))}
            </div>
          </div>

          {/* Card 2: Community Members */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" role="img" aria-label="People">
                👥
              </span>
              <h2 className="font-semibold text-slate-900 text-sm">
                Member Personas (docs/01)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Dual-role model: passengers and drivers share one unified account.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {memberTypes.map((type) => (
                <span
                  key={type}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize bg-primary-50/80 text-primary-800 border border-primary-200/50 shadow-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Banner (Glass with red accent) */}
        <div className="glass-card rounded-2xl p-4 mb-8 border-red-200/60 bg-red-50/40">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5" role="img" aria-label="Warning">
              ⚠️
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">
                Mandatory Safety Copy (docs/05 §SOS)
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                "{SAFETY_COPY.SOS_DISCLAIMER}"
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/40">
          <div className="text-xs text-slate-500 font-medium">
            Strict TypeScript · Zod Validation · WCAG AA Contrast
          </div>
          <button
            type="button"
            className="w-full sm:w-auto glass-button px-6 py-2.5 rounded-xl text-sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.alert('CampusRide GlassUI System Ready for Milestone 1!');
              }
            }}
          >
            Explore Design System →
          </button>
        </div>
      </main>
    </div>
  );
}
