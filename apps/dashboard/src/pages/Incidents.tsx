import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Incident } from '../lib/api'
import { Card, Badge, Button } from '../components/ui'
import { AlertTriangle, ChevronRight, RefreshCw, Search } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Incidents</h1>
          <p className="text-gray-400 mt-1">
            {incidents.length} total incidents detected
          </p>
        </div>
        <Button variant="secondary" onClick={fetchIncidents} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="flex items-center gap-4">
        <Search className="w-5 h-5 text-gray-500" />
        <div className="flex gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="w-px h-6 bg-soc-border mx-2" />
          {['detected', 'verified', 'false_positive', 'mitigated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Card>

      {/* Incidents Table */}
      <Card className="overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-soc-border">
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Package
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Severity
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Indicators
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Detected
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map(incident => (
              <tr
                key={incident.id}
                className="border-b border-soc-border/50 hover:bg-soc-dark/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${
                      incident.severity === 'critical' ? 'bg-red-500' :
                      incident.severity === 'high' ? 'bg-orange-500' :
                      incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-white">
                        {incident.package_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        v{incident.version}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={incident.severity}>
                    {incident.severity}
                  </Badge>
                </td>
                <td className="px-5 py-4">
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
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {incident.indicators.slice(0, 2).map((ind, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-soc-dark rounded text-xs text-gray-400"
                      >
                        {ind.type}
                      </span>
                    ))}
                    {incident.indicators.length > 2 && (
                      <span className="px-2 py-0.5 bg-soc-dark rounded text-xs text-gray-500">
                        +{incident.indicators.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div>
                    <p className="text-sm text-white">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(incident.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1 text-sm text-neon-cyan hover:underline"
                  >
                    Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No incidents match your filter</p>
          </div>
        )}
      </Card>
    </div>
  )
}
