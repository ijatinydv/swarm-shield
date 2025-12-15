import { Link, Outlet, useLocation } from 'react-router-dom'
import { Shield, AlertTriangle, Users, GitBranch, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { path: '/agents', icon: Users, label: 'Agents' },
  { path: '/ci-gate', icon: GitBranch, label: 'CI Gate' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-soc-darker">
      {/* Header */}
      <header className="border-b border-soc-border bg-soc-dark/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-pink p-0.5">
              <div className="w-full h-full bg-soc-dark rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-neon-cyan" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-neon-gradient">
                Swarm Shield
              </h1>
              <p className="text-xs text-gray-500">Security Operations Center</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  location.pathname === path
                    ? 'bg-neon-cyan/10 text-neon-cyan'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              Simulator Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
