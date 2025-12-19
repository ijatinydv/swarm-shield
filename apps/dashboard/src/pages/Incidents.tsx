import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Incident } from '../lib/api'
import { Card, Badge, Button } from '../components/ui'
import { AlertTriangle, RefreshCw, Hexagon, Activity, Filter, ExternalLink } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents()
      setIncidents(data)
    } catch (err) {
      console.error('Failed to fetch incidents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'all') return true
    return inc.severity === filter || inc.status === filter
  })

  // Stats
  const severityCounts = {
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    low: incidents.filter(i => i.severity === 'low').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-20 h-20 border-2 border-neon-pink/20 rounded-full animate-spin-slow" />
          <div className="absolute inset-2 border-2 border-t-neon-pink border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-neon-pink animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Hexagon className="w-5 h-5 text-neon-pink" />
            <h1 className="text-3xl font-display font-bold tracking-wide">
              <span className="glow-text-pink">SECURITY</span>
              <span className="text-white ml-2">INCIDENTS</span>
            </h1>
          </div>
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-pink animate-pulse" />
            {incidents.length} total incidents detected across the network
          </p>
        </div>
        <Button variant="secondary" onClick={fetchIncidents} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Severity Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: 'critical', label: 'Critical', color: 'red', count: severityCounts.critical },
          { key: 'high', label: 'High', color: 'orange', count: severityCounts.high },
          { key: 'medium', label: 'Medium', color: 'yellow', count: severityCounts.medium },
          { key: 'low', label: 'Low', color: 'blue', count: severityCounts.low },
        ].map(({ key, label, color, count }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`glass-panel p-4 text-left transition-all duration-300 hover:-translate-y-1 ${
              filter === key ? `border-${color}-500/50 shadow-[0_0_20px_rgba(var(--${color}),0.2)]` : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-${color}-400 font-mono text-xs uppercase tracking-wider`}>{label}</span>
              {count > 0 && (
                <span className={`w-2 h-2 rounded-full bg-${color}-500 ${key === 'critical' ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`} />
              )}
            </div>
            <p className={`text-3xl font-display font-bold text-${color}-400`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-neon-cyan" />
          <span className="text-sm font-mono text-gray-400 uppercase tracking-wider">Filter by:</span>
        </div>
        <div className="flex gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
                filter === f
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,242,234,0.2)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="w-px h-6 bg-soc-border mx-2 self-center" />
          {['detected', 'verified', 'false_positive', 'mitigated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
                filter === f
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,242,234,0.2)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Card>

      {/* Incidents Table */}
      <Card className="overflow-hidden p-0">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-soc-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center border border-neon-pink/30">
            <AlertTriangle className="w-4 h-4 text-neon-pink" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white tracking-wide">INCIDENT LOG</h2>
            <p className="text-xs text-gray-500 font-mono">{filteredIncidents.length} incidents shown</p>
          </div>
        </div>

        <table className="cyber-table">
          <thead>
            <tr className="border-b border-soc-border">
              <th className="text-left text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Package
              </th>
              <th className="text-left text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Severity
              </th>
              <th className="text-left text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Status
              </th>
              <th className="text-left text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Indicators
              </th>
              <th className="text-left text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Detected
              </th>
              <th className="text-right text-[10px] font-mono font-medium text-neon-cyan/70 uppercase tracking-widest px-6 py-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map(incident => (
              <tr
                key={incident.id}
                className="border-b border-soc-border/30 hover:bg-neon-cyan/5 transition-all duration-200 group"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    {/* Severity bar */}
                    <div className={`relative w-1 h-10 rounded-full overflow-hidden ${
                      incident.severity === 'critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                      incident.severity === 'high' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                      incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}>
                      {incident.severity === 'critical' && (
                        <div className="absolute inset-0 bg-red-400 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-white group-hover:text-neon-cyan transition-colors">
                        {incident.package_name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        v{incident.version}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <Badge variant={incident.severity} pulse={incident.severity === 'critical'}>
                    {incident.severity}
                  </Badge>
                </td>
                <td className="px-6 py-5">
                  <Badge 
                    variant={
                      incident.status === 'verified' ? 'warning' :
                      incident.status === 'false_positive' ? 'success' :
                      incident.status === 'mitigated' ? 'success' : 'info'
                    }
                  >
                    {incident.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-1.5">
                    {incident.indicators.slice(0, 2).map((ind, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-soc-dark/80 rounded-md text-[10px] text-gray-400 font-mono border border-soc-border"
                      >
                        {ind.type}
                      </span>
                    ))}
                    {incident.indicators.length > 2 && (
                      <span className="px-2 py-1 bg-neon-cyan/10 rounded-md text-[10px] text-neon-cyan font-mono border border-neon-cyan/20">
                        +{incident.indicators.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div>
                    <p className="text-sm text-white font-mono">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono">
                      {format(new Date(incident.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 text-xs font-mono uppercase tracking-wider hover:bg-neon-cyan/20 hover:shadow-neon-cyan transition-all duration-300"
                  >
                    Investigate <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredIncidents.length === 0 && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-4">
              <AlertTriangle className="w-16 h-16 text-gray-600" />
              <div className="absolute inset-0 blur-xl bg-neon-pink/10" />
            </div>
            <p className="text-gray-400 font-display text-lg">No incidents match your filter</p>
            <p className="text-sm text-gray-600 mt-2 font-mono">
              Try adjusting your filter criteria
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
