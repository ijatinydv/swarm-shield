import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Incident, Agent, Credential } from '../lib/api'
import { Card, Badge, Button } from '../components/ui'
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Clock, 
  ChevronRight,
  PlayCircle,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchData = async () => {
    try {
      const [inc, ag, cred] = await Promise.all([
        api.getIncidents(),
        api.getAgents(),
        api.getCredentials(),
      ])
      setIncidents(inc)
      setAgents(ag)
      setCredentials(cred)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.seedDemo().catch(() => {})
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const triggerDemo = async (scenario: string) => {
    setTriggering(true)
    try {
      await api.triggerDemo('', scenario)
      setTimeout(fetchData, 1000)
    } catch (err) {
      console.error('Failed to trigger demo:', err)
    } finally {
      setTriggering(false)
    }
  }

  const stats = {
    totalIncidents: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    activeAgents: agents.filter(a => a.status === 'online').length,
    credentials: credentials.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time dependency threat monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => fetchData()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Triggers */}
      <Card className="bg-gradient-to-r from-neon-cyan/5 to-neon-pink/5 border-neon-cyan/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-neon-cyan" />
            <div>
              <h3 className="font-semibold text-white">Demo Scenarios</h3>
              <p className="text-sm text-gray-400">Trigger simulated security incidents</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => triggerDemo('typosquat')}
              disabled={triggering}
            >
              Typosquat
            </Button>
            <Button 
              size="sm"
              variant="secondary"
              onClick={() => triggerDemo('malicious_scripts')}
              disabled={triggering}
            >
              Malicious Scripts
            </Button>
            <Button 
              size="sm"
              variant="secondary"
              onClick={() => triggerDemo('obfuscated')}
              disabled={triggering}
            >
              Obfuscated Code
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats.totalIncidents}</p>
          <p className="text-sm text-gray-400">Total Incidents</p>
          {stats.critical > 0 && (
            <Badge variant="critical" className="mt-2">
              {stats.critical} critical
            </Badge>
          )}
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Shield className="w-8 h-8 text-neon-cyan mb-3" />
          <p className="text-3xl font-bold text-white">{stats.credentials}</p>
          <p className="text-sm text-gray-400">Trust Credentials</p>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-green/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Users className="w-8 h-8 text-neon-green mb-3" />
          <p className="text-3xl font-bold text-white">{stats.activeAgents}</p>
          <p className="text-sm text-gray-400">Active Agents</p>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-pink/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Clock className="w-8 h-8 text-neon-pink mb-3" />
          <p className="text-3xl font-bold text-white">
            {incidents.length > 0 
              ? formatDistanceToNow(new Date(incidents[0].created_at), { addSuffix: true })
              : 'N/A'
            }
          </p>
          <p className="text-sm text-gray-400">Last Incident</p>
        </Card>
      </div>

      {/* Recent Incidents & Agents */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
            <Link to="/incidents" className="text-sm text-neon-cyan hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {incidents.slice(0, 5).map(incident => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-soc-dark/50 hover:bg-soc-dark transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    incident.severity === 'critical' ? 'bg-red-500' :
                    incident.severity === 'high' ? 'bg-orange-500' :
                    incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium text-white text-sm">
                      {incident.package_name}@{incident.version}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={incident.severity}>{incident.severity}</Badge>
                  <Badge 
                    variant={
                      incident.status === 'verified' ? 'warning' :
                      incident.status === 'false_positive' ? 'success' :
                      incident.status === 'mitigated' ? 'success' : 'info'
                    }
                  >
                    {incident.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {incidents.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No incidents detected. Use demo buttons above to simulate.
              </p>
            )}
          </div>
        </Card>

        {/* Credential Timeline */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Credential Timeline</h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {credentials.slice(0, 10).map(cred => (
              <div
                key={cred.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-soc-dark/50"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  cred.type === 'SafeToUseAttestation' ? 'bg-green-500/20 text-green-400' :
                  cred.type === 'RiskFindingCredential' ? 'bg-red-500/20 text-red-400' :
                  cred.type === 'VerifiedIncidentCredential' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Issued by {cred.issuer_did.split(':').pop()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(cred.issuance_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {credentials.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No credentials issued yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
