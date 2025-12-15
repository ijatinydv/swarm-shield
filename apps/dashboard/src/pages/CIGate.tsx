import { useState } from 'react'
import { api, CICheckResult } from '../lib/api'
import { Card, Badge, Button, Input } from '../components/ui'
import { GitBranch, CheckCircle, XCircle, AlertTriangle, Shield, Loader2 } from 'lucide-react'

export default function CIGate() {
  const [projectId, setProjectId] = useState('my-project')
  const [packageName, setPackageName] = useState('')
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CICheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPackage = async () => {
    if (!packageName || !version) {
      setError('Package name and version are required')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.checkCI(projectId, packageName, version)
      setResult(res)
    } catch (err) {
      setError('Failed to check package. Make sure the CI agent is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">CI Gate Check</h1>
        <p className="text-gray-400 mt-1">
          Verify if a package version is safe to use in your CI/CD pipeline
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-neon-cyan" />
            Package Check
          </h2>

          <div className="space-y-4">
            <Input
              label="Project ID"
              placeholder="my-project"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            />
            <Input
              label="Package Name"
              placeholder="e.g., lodash-utils"
              value={packageName}
              onChange={e => setPackageName(e.target.value)}
            />
            <Input
              label="Version"
              placeholder="e.g., 1.0.1"
              value={version}
              onChange={e => setVersion(e.target.value)}
            />
            <Button
              onClick={checkPackage}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Package'
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Quick Test Buttons */}
          <div className="mt-6 pt-4 border-t border-soc-border">
            <p className="text-xs text-gray-500 mb-2">Quick test packages:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setPackageName('lodash-utils'); setVersion('1.0.1'); }}
                className="px-3 py-1.5 bg-soc-dark rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                lodash-utils@1.0.1 (malicious)
              </button>
              <button
                onClick={() => { setPackageName('lodash-utils'); setVersion('1.0.0'); }}
                className="px-3 py-1.5 bg-soc-dark rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                lodash-utils@1.0.0 (safe)
              </button>
              <button
                onClick={() => { setPackageName('lodash'); setVersion('4.17.21'); }}
                className="px-3 py-1.5 bg-soc-dark rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                lodash@4.17.21 (clean)
              </button>
            </div>
          </div>
        </Card>

        {/* Result Display */}
        <Card className={result ? (result.allowed ? 'border-green-500/30' : 'border-red-500/30') : ''}>
          <h2 className="text-lg font-semibold text-white mb-4">Gate Decision</h2>

          {!result && !loading && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Enter a package to check</p>
              <p className="text-sm text-gray-600 mt-1">
                The CI agent will verify against active incidents and attestations
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-neon-cyan mx-auto mb-3 animate-spin" />
              <p className="text-gray-400">Checking package...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Main Decision */}
              <div className={`p-6 rounded-xl ${
                result.allowed 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.allowed ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                  <div>
                    <p className={`text-xl font-bold ${result.allowed ? 'text-green-400' : 'text-red-400'}`}>
                      {result.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {packageName}@{version}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{result.reason}</p>
              </div>

              {/* Blocking Incidents */}
              {result.blocking_incidents.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Blocking Incidents</p>
                  <div className="space-y-2">
                    {result.blocking_incidents.map(incId => (
                      <div
                        key={incId}
                        className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-400 font-mono">{incId.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Credentials */}
              {result.required_credentials.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Required Credentials</p>
                  <div className="flex flex-wrap gap-2">
                    {result.required_credentials.map(cred => (
                      <Badge key={cred} variant="warning">{cred}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Attestations */}
              {result.attestations.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Attestations Found</p>
                  <div className="space-y-2">
                    {result.attestations.map(att => (
                      <div
                        key={att.id}
                        className={`p-3 rounded-lg border ${
                          att.valid 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {att.valid ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-400">
                              {att.issuer.split(':').pop()}
                            </span>
                          </div>
                          <Badge variant={att.valid ? 'success' : 'warning'}>
                            {att.reason}
                          </Badge>
                        </div>
                        {att.expires && (
                          <p className="text-xs text-gray-600 mt-1">
                            Expires: {new Date(att.expires).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
