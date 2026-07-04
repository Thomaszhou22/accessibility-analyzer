// Landing Page Modal
interface HeroModalProps {
  open: boolean
  onClose: () => void
}

export default function HeroModal({ open, onClose }: HeroModalProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop - darker for readability */}
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-card/80 hover:bg-accent/20 flex items-center justify-center text-muted hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                AccessScan
              </h1>
              <p className="text-xl md:text-2xl text-white font-light mb-2">
                Make the web accessible for everyone
              </p>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
                Over 1.6 billion people live with a disability. Yet
                <span className="text-white font-semibold"> 96% of websites </span>
                fail WCAG standards. AccessScan helps you find and fix these issues in seconds.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <StatCard value="20" label="WCAG Rules" color="primary" />
              <StatCard value="4.5:1" label="Contrast Check" color="accent" />
              <StatCard value="2.1" label="WCAG Standard" color="primary" />
              <StatCard value="0" label="Dependencies" color="accent" />
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <FeatureCard
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                title="WCAG Rules"
                description="20 rules covering alt text, form labels, contrast, semantic HTML and more"
              />
              <FeatureCard
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                title="Live Preview Highlight"
                description="Click any issue to highlight the exact element in a live preview"
              />
              <FeatureCard
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                title="Multi-Agent Fetching"
                description="7-layer fetch strategy with automatic proxy fallbacks for reliable crawling"
              />
              <FeatureCard
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="PDF Report Export"
                description="One-click printable reports with issue details and fix recommendations"
              />
            </div>

            {/* Action button */}
            <div className="text-center">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Start Scanning
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ value, label, color }: { value: string; label: string; color: 'primary' | 'accent' }) {
  return (
    <div className="text-center p-3 rounded-lg bg-card/50 border border-border/50">
      <div className={`text-2xl font-bold mb-0.5 ${color === 'primary' ? 'text-primary' : 'text-accent'}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-card/40 border border-border/50">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
