import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, Incident, Credential, CredentialVerification } from '../lib/api'
import { Card, Badge, ProgressRing } from '../components/ui'
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileWarning,
  RefreshCw,
  Hexagon,
  AlertTriangle,
  Activity,
  Lock,
  Unlock
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [verifications, setVerifications] = useState<Record<string, CredentialVerification>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const [inc, creds] = await Promise.all([
          api.getIncident(id),
          api.getCredentials(id),
        ])
        setIncident(inc)
        setCredentials(creds)

        // Verify each credential
        const verifs: Record<string, CredentialVerification> = {}
        for (const cred of creds) {
          try {
            verifs[cred.id] = await api.verifyCredential(cred.id)
          } catch {
            verifs[cred.id] = {
              credential_id: cred.id,
              signature_valid: false,
              issuer_verified: false,
              issuer_did: cred.issuer_did,
            }
          }
        }
        setVerifications(verifs)
      } catch (err) {
        console.error('Failed to fetch incident:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [id])

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

  if (!incident) {
    return (
      <div className="text-center py-20">
        <div className="relative inline-block mb-6">
          <FileWarning className="w-20 h-20 text-gray-600" />
          <div className="absolute inset-0 blur-2xl bg-neon-pink/10" />
        </div>
        <p className="text-gray-400 font-display text-xl">Incident not found</p>
        <Link to="/incidents" className="inline-flex items-center gap-2 mt-4 text-neon-cyan hover:text-white font-mono text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to incidents
        </Link>
      </div>
    )
  }

  // Calculate overall confidence
  const avgConfidence = incident.indicators.length > 0
    ? incident.indicators.reduce((sum, ind) => sum + ind.confidence, 0) / incident.indicators.length
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-neon-cyan mb-4 font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to incidents
          </Link>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-3">
              <Hexagon className="w-5 h-5 text-neon-pink" />
              <h1 className="text-3xl font-display font-bold tracking-wide">
                <span className="text-white">{incident.package_name}</span>
                <span className="text-gray-500 ml-2">@{incident.version}</span>
              </h1>
            </div>
            <Badge variant={incident.severity} pulse={incident.severity === 'critical'}>
              {incident.severity}
            </Badge>
            <Badge 
              variant={
                incident.status === 'verified' ? 'warning' :
                incident.status === 'false_positive' ? 'success' :
                incident.status === 'mitigated' ? 'success' : 'info'
              }
            >
              {incident.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-pink" />
            {incident.description}
          </p>
        </div>

        {/* Confidence Gauge */}
        <div className="glass-panel p-4 text-center">
          <ProgressRing 
            progress={avgConfidence * 100} 
            size={90}
            strokeWidth={5}
            variant={avgConfidence >= 0.8 ? 'pink' : avgConfidence >= 0.5 ? 'cyan' : 'green'}
          >
            <div className="text-center">
              <p className={`text-xl font-display font-bold ${
                avgConfidence >= 0.8 ? 'text-neon-pink' : avgConfidence >= 0.5 ? 'text-neon-cyan' : 'text-neon-green'
              }`}>
                {Math.round(avgConfidence * 100)}%
              </p>
            </div>
          </ProgressRing>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-2">Confidence</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Timeline (Left - 2 columns) */}
        <div className="col-span-2 space-y-6">
          {/* Incident Timeline */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30">
                <Clock className="w-4 h-4 text-neon-cyan" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">INCIDENT TIMELINE</h2>
            </div>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-neon-pink via-neon-cyan to-transparent" />
              
              <div className="space-y-6">
                {/* Detection Event */}
                <div className="relative pl-14">
                  <div className="absolute left-2.5 w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div className="glass-panel p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-display font-semibold text-red-400 tracking-wide">INCIDENT DETECTED</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {format(new Date(incident.created_at), 'MMM d, HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono">
                      Scanner agent detected {incident.indicators.length} risk indicator(s) in package
                    </p>
                  </div>
                </div>

                {/* Credentials Timeline */}
                {credentials.map((cred) => (
                  <div key={cred.id} className="relative pl-14">
                    <div className={`absolute left-2.5 w-6 h-6 rounded-full flex items-center justify-center ${
                      cred.type === 'SafeToUseAttestation' 
                        ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_15px_rgba(57,255,20,0.3)]' 
                        : cred.type === 'VerifiedIncidentCredential'
                        ? 'bg-orange-500/20 border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : cred.type === 'FalsePositiveCredential'
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 shadow-[0_0_15px_rgba(0,242,234,0.3)]'
                        : 'bg-red-500/20 border-2 border-red-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        cred.type === 'SafeToUseAttestation' ? 'bg-green-500' :
                        cred.type === 'VerifiedIncidentCredential' ? 'bg-orange-500' :
                        cred.type === 'FalsePositiveCredential' ? 'bg-cyan-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="glass-panel p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-display font-semibold tracking-wide ${
                          cred.type === 'SafeToUseAttestation' ? 'text-green-400' :
                          cred.type === 'VerifiedIncidentCredential' ? 'text-orange-400' :
                          cred.type === 'FalsePositiveCredential' ? 'text-cyan-400' : 'text-red-400'
                        }`}>
                          {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {format(new Date(cred.issuance_date), 'MMM d, HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 font-mono">
                        Issued by <span className="text-neon-cyan">{cred.issuer_did.split(':').pop()}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Risk Indicators */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center border border-neon-pink/30">
                <FileWarning className="w-4 h-4 text-neon-pink" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">RISK INDICATORS</h2>
            </div>
            
            <div className="space-y-4">
              {incident.indicators.map((ind, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-4 p-5 glass-panel hover:border-neon-pink/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center flex-shrink-0 border border-red-500/30 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all">
                    <FileWarning className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-display font-semibold text-white capitalize tracking-wide">
                        {ind.type.replace(/_/g, ' ')}
                      </span>
                      <Badge 
                        variant={ind.confidence >= 0.8 ? 'critical' : ind.confidence >= 0.6 ? 'high' : 'medium'}
                        pulse={ind.confidence >= 0.8}
                      >
                        {Math.round(ind.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{ind.description}</p>
                    {ind.evidence && (
                      <div className="mt-3 p-3 bg-soc-dark/50 rounded-lg border border-soc-border">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-mono">Evidence</p>
                        <p className="text-xs text-gray-400 font-mono break-all">
                          {ind.evidence.slice(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Trust Credentials */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/30">
                <Shield className="w-4 h-4 text-neon-green" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">CREDENTIALS</h2>
            </div>
            
            <div className="space-y-4">
              {credentials.map(cred => {
                const verification = verifications[cred.id]
                return (
                  <div
                    key={cred.id}
                    className={`p-4 rounded-xl border backdrop-blur-sm ${
                      cred.type === 'SafeToUseAttestation'
                        ? 'bg-green-500/5 border-green-500/30'
                        : cred.type === 'VerifiedIncidentCredential'
                        ? 'bg-orange-500/5 border-orange-500/30'
                        : cred.type === 'FalsePositiveCredential'
                        ? 'bg-cyan-500/5 border-cyan-500/30'
                        : 'bg-red-500/5 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        cred.type === 'SafeToUseAttestation' ? 'text-green-400' :
                        cred.type === 'VerifiedIncidentCredential' ? 'text-orange-400' :
                        cred.type === 'FalsePositiveCredential' ? 'text-cyan-400' : 'text-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-medium text-white text-sm tracking-wide">
                          {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate mt-1 font-mono">
                          ID: {cred.id.slice(0, 12)}...
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">
                          Issuer: <span className="text-neon-cyan">{cred.issuer_did.split(':').pop()}</span>
                        </p>
                        
                        {/* Verification Status */}
                        {verification && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                            <div className="flex items-center gap-2">
                              {verification.signature_valid ? (
                                <Lock className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span className={`text-[10px] font-mono ${verification.signature_valid ? 'text-green-400' : 'text-red-400'}`}>
                                Signature {verification.signature_valid ? 'VALID' : 'INVALID'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {verification.issuer_verified ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span className={`text-[10px] font-mono ${verification.issuer_verified ? 'text-green-400' : 'text-red-400'}`}>
                                Issuer {verification.issuer_verified ? 'VERIFIED' : 'UNVERIFIED'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Expiration */}
                        {cred.expiration_date && (
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-[10px] text-gray-500 font-mono">
                              Expires {formatDistanceToNow(new Date(cred.expiration_date), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {credentials.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 font-mono text-xs">No credentials issued yet</p>
                </div>
              )}
            </div>
          </Card>

          {/* Incident Details */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Hexagon className="w-4 h-4 text-gray-400" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">DETAILS</h2>
            </div>
            
            <dl className="space-y-4">
              <div className="p-3 bg-soc-dark/50 rounded-lg">
                <dt className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Package</dt>
                <dd className="text-white font-mono text-sm">{incident.package_name}</dd>
              </div>
              <div className="p-3 bg-soc-dark/50 rounded-lg">
                <dt className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Version</dt>
                <dd className="text-white font-mono text-sm">{incident.version}</dd>
              </div>
              <div className="p-3 bg-soc-dark/50 rounded-lg">
                <dt className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Incident ID</dt>
                <dd className="text-gray-400 font-mono text-[10px] break-all">{incident.id}</dd>
              </div>
              <div className="p-3 bg-soc-dark/50 rounded-lg">
                <dt className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Created</dt>
                <dd className="text-gray-400 font-mono text-xs">
                  {format(new Date(incident.created_at), 'PPpp')}
                </dd>
              </div>
              <div className="p-3 bg-soc-dark/50 rounded-lg">
                <dt className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">Last Updated</dt>
                <dd className="text-gray-400 font-mono text-xs">
                  {format(new Date(incident.updated_at), 'PPpp')}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
