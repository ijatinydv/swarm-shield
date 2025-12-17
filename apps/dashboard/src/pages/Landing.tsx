import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Scan, Shield, Zap, ArrowUpRight } from 'lucide-react'
import { Navbar, Button, Card } from '../components/ui'

const features = [
  {
    title: 'Swarm Detection',
    icon: Scan,
    body: 'Real-time anomaly detection that traces package lineage across your CI/CD graph.',
    accent: 'cyan' as const,
  },
  {
    title: 'Verifiable Trust',
    icon: Shield,
    body: 'Attestations, SBOMs, and signatures woven directly into your supply chain fabric.',
    accent: 'pink' as const,
  },
  {
    title: 'Auto-Patching',
    icon: Zap,
    body: 'Autonomous remediations that deploy signed patches the moment drift is detected.',
    accent: 'cyan' as const,
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-soc-bg text-white overflow-hidden">
      <Navbar />

      <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Ambient backdrop */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-cyber-grid bg-grid-size opacity-30 animate-gradient-shift" />
          <div className="absolute -top-10 -left-16 w-72 h-72 bg-neon-cyan/20 blur-[120px]" />
          <div className="absolute top-32 right-0 w-80 h-80 bg-neon-pink/20 blur-[140px]" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-[0.2em] uppercase">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" /> Live Threat Intel
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
              Secure Your Supply Chain
              <span className="block text-neon-cyan">at the Speed of Code.</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-xl">
              Swarm Shield turns your pipelines into a living SOC—detecting, verifying, and auto-patching threats before they land in production.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/app">
                <Button variant="glow" size="lg">Launch Console</Button>
              </Link>
              <Button variant="ghost" size="lg" className="border-white/20 text-gray-300">
                View Docs
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-6 pt-4 text-sm text-gray-400 font-mono">
              <div>
                <span className="text-white">Zero-Trust</span> Builders
              </div>
              <div>
                <span className="text-white">AI-Driven</span> Threat Hunting
              </div>
              <div>
                <span className="text-white">Deterministic</span> Remediation
              </div>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-pink/10 blur-3xl" />
            <Card className="relative overflow-hidden border-white/5">
              <div className="absolute inset-0 bg-cyber-grid bg-grid-size opacity-20" />
              <div className="absolute -inset-12 bg-[radial-gradient(circle_at_30%_30%,rgba(0,242,234,0.15),transparent_45%)]" />
              <div className="absolute -inset-12 bg-[radial-gradient(circle_at_70%_70%,rgba(255,0,85,0.1),transparent_40%)]" />

              <div className="relative aspect-square">
                <motion.div
                  initial={{ opacity: 0, rotate: -8 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="absolute inset-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="absolute inset-14 rounded-[28px] border border-neon-cyan/40 shadow-[0_0_45px_rgba(0,242,234,0.25)] bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-pink/10"
                />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45, duration: 0.6 }}
                  className="absolute inset-0 grid place-items-center"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 backdrop-blur-md grid place-items-center shadow-[0_0_40px_rgba(0,242,234,0.15)]">
                      <Scan className="w-10 h-10 text-neon-cyan drop-shadow-[0_0_12px_rgba(0,242,234,0.8)]" />
                    </div>
                    <p className="text-center text-gray-300 max-w-xs">
                      Synthetic agents patrol every dependency, mapping swarm behavior like a star chart.
                    </p>
                  </div>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          {features.map(({ title, icon: Icon, body, accent }) => (
            <Card key={title} accent={accent} className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center">
                  <Icon className={accent === 'pink' ? 'text-neon-pink' : 'text-neon-cyan'} />
                </div>
                <p className="text-lg font-semibold">{title}</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
