import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Shield, AlertTriangle, Users, GitBranch, LayoutDashboard, Activity, Radio } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { path: '/agents', icon: Users, label: 'Agents' },
  { path: '/ci-gate', icon: GitBranch, label: 'CI Gate' },
]

export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top gradient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-neon-pink/5 rounded-full blur-[100px]" />
        {/* Bottom ambient */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-neon-cyan/3 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-soc-border sticky top-0">
        {/* Glassmorphic header background */}
        <div className="absolute inset-0 bg-soc-darker/80 backdrop-blur-xl" />
        
        {/* Animated top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/app" className="flex items-center gap-4 group">
            {/* Hexagonal Logo Container */}
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-xl opacity-30 blur group-hover:opacity-50 transition-opacity" />
              
              {/* Logo box */}
              <div className="relative w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-pink/20 rounded-xl border border-neon-cyan/30 flex items-center justify-center overflow-hidden">
                {/* Inner shield */}
                <Shield className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_10px_rgba(0,242,234,0.8)] group-hover:scale-110 transition-transform" />
                
                {/* Scan line effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/10 to-transparent translate-y-full group-hover:translate-y-[-100%] transition-transform duration-700" />
              </div>
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-xl font-display font-bold tracking-wider">
                <span className="glow-text-cyan">SWARM</span>
                <span className="text-white ml-2">SHIELD</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Activity className="w-3 h-3 text-neon-cyan animate-pulse" />
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">
                  Security Operations Center
                </p>
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path || 
                (path !== '/app' && location.pathname.startsWith(path))
              
              return (
                <Link
                  key={path}
                  to={path}
                  className={clsx(
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300',
                    'hover:-translate-y-0.5',
                    isActive
                      ? 'text-neon-cyan'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {/* Active background */}
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30" />
                      <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent rounded-lg" />
                      {/* Bottom glow bar */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon-cyan rounded-full shadow-[0_0_10px_rgba(0,242,234,0.8)]" />
                    </>
                  )}
                  
                  {/* Hover background */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/0 hover:bg-white/5 rounded-lg transition-colors" />
                  )}
                  
                  <Icon className={clsx(
                    'relative w-4 h-4 transition-all',
                    isActive && 'drop-shadow-[0_0_8px_rgba(0,242,234,0.8)]'
                  )} />
                  <span className="relative font-mono text-xs uppercase tracking-wider">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="relative">
                <Radio className="w-4 h-4 text-neon-green" />
                <div className="absolute inset-0 animate-ping">
                  <Radio className="w-4 h-4 text-neon-green opacity-50" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-mono text-neon-green">
                  SIMULATION ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {children ?? <Outlet />}
      </main>

      {/* Footer accent line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/10 to-transparent pointer-events-none z-50" />
    </div>
  )
}
