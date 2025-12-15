import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, Incident, Credential, CredentialVerification } from '../lib/api'
import { Card, Badge } from '../components/ui'
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileWarning,
  RefreshCw
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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <FileWarning className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500">Incident not found</p>
        <Link to="/incidents" className="text-neon-cyan hover:underline mt-2 inline-block">
          Back to incidents
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to incidents
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {incident.package_name}@{incident.version}
            </h1>
            <Badge variant={incident.severity}>{incident.severity}</Badge>
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
          <p className="text-gray-400 mt-2">{incident.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Timeline (Left) */}
        <div className="col-span-2 space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Incident Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-soc-border" />
              <div className="space-y-6">
                {/* Detection Event */}
                <div className="relative pl-10">
                  <div className="absolute left-2 w-5 h-5 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                  <div className="bg-soc-dark/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-400">Incident Detected</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(incident.created_at), 'MMM d, HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Scanner agent detected {incident.indicators.length} risk indicator(s)
                    </p>
                  </div>
                </div>

                {/* Credentials Timeline */}
                {credentials.map((cred, idx) => (
                  <div key={cred.id} className="relative pl-10">
                    <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      cred.type === 'SafeToUseAttestation' 
                        ? 'bg-green-500/20 border-2 border-green-500' 
                        : cred.type === 'VerifiedIncidentCredential'
                        ? 'bg-orange-500/20 border-2 border-orange-500'
                        : cred.type === 'FalsePositiveCredential'
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-red-500/20 border-2 border-red-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        cred.type === 'SafeToUseAttestation' ? 'bg-green-500' :
                        cred.type === 'VerifiedIncidentCredential' ? 'bg-orange-500' :
                        cred.type === 'FalsePositiveCredential' ? 'bg-cyan-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="bg-soc-dark/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          cred.type === 'SafeToUseAttestation' ? 'text-green-400' :
                          cred.type === 'VerifiedIncidentCredential' ? 'text-orange-400' :
                          cred.type === 'FalsePositiveCredential' ? 'text-cyan-400' : 'text-red-400'
                        }`}>
                          {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(cred.issuance_date), 'MMM d, HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
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
            <h2 className="text-lg font-semibold text-white mb-4">Risk Indicators</h2>
            <div className="space-y-3">
              {incident.indicators.map((ind, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 bg-soc-dark/50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <FileWarning className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white capitalize">
                        {ind.type.replace('_', ' ')}
                      </span>
                      <Badge 
                        variant={ind.confidence >= 0.8 ? 'critical' : ind.confidence >= 0.6 ? 'high' : 'medium'}
                      >
                        {Math.round(ind.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{ind.description}</p>
                    {ind.evidence && (
                      <p className="text-xs text-gray-600 mt-2 font-mono">
                        Evidence: {ind.evidence.slice(0, 32)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Credentials (Right) */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Trust Credentials</h2>
            <div className="space-y-3">
              {credentials.map(cred => {
                const verification = verifications[cred.id]
                return (
                  <div
                    key={cred.id}
                    className={`p-4 rounded-lg border ${
                      cred.type === 'SafeToUseAttestation'
                        ? 'bg-green-500/5 border-green-500/20'
                        : cred.type === 'VerifiedIncidentCredential'
                        ? 'bg-orange-500/5 border-orange-500/20'
                        : cred.type === 'FalsePositiveCredential'
                        ? 'bg-cyan-500/5 border-cyan-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Shield className={`w-5 h-5 flex-shrink-0 ${
                        cred.type === 'SafeToUseAttestation' ? 'text-green-400' :
                        cred.type === 'VerifiedIncidentCredential' ? 'text-orange-400' :
                        cred.type === 'FalsePositiveCredential' ? 'text-cyan-400' : 'text-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">
                          {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          ID: {cred.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Issuer: <span className="text-neon-cyan">{cred.issuer_did.split(':').pop()}</span>
                        </p>
                        
                        {/* Verification Status */}
                        {verification && (
                          <div className="mt-3 pt-3 border-t border-soc-border/50">
                            <div className="flex items-center gap-2 text-xs">
                              {verification.signature_valid ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className={verification.signature_valid ? 'text-green-400' : 'text-red-400'}>
                                Signature {verification.signature_valid ? 'valid' : 'invalid'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              {verification.issuer_verified ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className={verification.issuer_verified ? 'text-green-400' : 'text-red-400'}>
                                Issuer {verification.issuer_verified ? 'verified' : 'unverified'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Expiration */}
                        {cred.expiration_date && (
                          <div className="flex items-center gap-2 text-xs mt-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-500">
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
                <p className="text-center text-gray-500 py-4">
                  No credentials issued yet
                </p>
              )}
            </div>
          </Card>

          {/* Incident Info */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase">Package</dt>
                <dd className="text-white font-mono">{incident.package_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Version</dt>
                <dd className="text-white font-mono">{incident.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Incident ID</dt>
                <dd className="text-gray-400 font-mono text-xs">{incident.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Created</dt>
                <dd className="text-gray-400">
                  {format(new Date(incident.created_at), 'PPpp')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Last Updated</dt>
                <dd className="text-gray-400">
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
