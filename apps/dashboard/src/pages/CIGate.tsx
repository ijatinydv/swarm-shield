import { useState } from 'react'
import { api, CICheckResult } from '../lib/api'
import { Card, Badge, Button, Input } from '../components/ui'
import { 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Loader2, 
  Hexagon, 
  Search,
  Lock,
  Unlock,
  Zap,
  Terminal
} from 'lucide-react'

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Hexagon className="w-5 h-5 text-neon-cyan" />
          <h1 className="text-3xl font-display font-bold tracking-wide">
            <span className="glow-text-cyan">CI</span>
            <span className="text-white ml-2">GATE CHECK</span>
          </h1>
        </div>
        <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neon-cyan" />
          Verify package safety for CI/CD pipeline integration
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30">
              <GitBranch className="w-4 h-4 text-neon-cyan" />
            </div>
            <h2 className="font-display font-semibold text-white tracking-wide">PACKAGE CHECK</h2>
          </div>

          <div className="space-y-5">
            <Input
              label="Project ID"
              placeholder="my-project"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              icon={<Hexagon className="w-4 h-4" />}
            />
            <Input
              label="Package Name"
              placeholder="e.g., lodash-utils"
              value={packageName}
              onChange={e => setPackageName(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            <Input
              label="Version"
              placeholder="e.g., 1.0.1"
              value={version}
              onChange={e => setVersion(e.target.value)}
              icon={<GitBranch className="w-4 h-4" />}
            />
            <Button
              onClick={checkPackage}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Check Package
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-5 p-4 glass-panel glass-panel-danger">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-neon-pink" />
                <p className="text-sm text-neon-pink font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Quick Test Buttons */}
          <div className="mt-6 pt-6 border-t border-soc-border">
            <p className="text-[10px] text-gray-500 mb-3 font-mono uppercase tracking-wider">Quick test packages</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setPackageName('lodash-utils'); setVersion('1.0.1'); }}
                className="px-3 py-2 glass-panel text-xs text-gray-400 hover:text-neon-pink hover:border-neon-pink/30 transition-all duration-300 font-mono"
              >
                <span className="text-neon-pink">⚠</span> lodash-utils@1.0.1
              </button>
              <button
                onClick={() => { setPackageName('lodash-utils'); setVersion('1.0.0'); }}
                className="px-3 py-2 glass-panel text-xs text-gray-400 hover:text-neon-green hover:border-neon-green/30 transition-all duration-300 font-mono"
              >
                <span className="text-neon-green">✓</span> lodash-utils@1.0.0
              </button>
              <button
                onClick={() => { setPackageName('lodash'); setVersion('4.17.21'); }}
                className="px-3 py-2 glass-panel text-xs text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-300 font-mono"
              >
                <span className="text-neon-cyan">◉</span> lodash@4.17.21
              </button>
            </div>
          </div>
        </Card>

        {/* Result Display */}
        <Card className={result ? (result.allowed ? 'border-neon-green/30' : 'border-neon-pink/30 glass-panel-danger') : ''}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              result 
                ? result.allowed 
                  ? 'bg-neon-green/10 border-neon-green/30' 
                  : 'bg-neon-pink/10 border-neon-pink/30'
                : 'bg-white/5 border-white/10'
            }`}>
              {result ? (
                result.allowed ? <Unlock className="w-4 h-4 text-neon-green" /> : <Lock className="w-4 h-4 text-neon-pink" />
              ) : (
                <Shield className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <h2 className="font-display font-semibold text-white tracking-wide">GATE DECISION</h2>
          </div>

          {!result && !loading && (
            <div className="text-center py-16">
              <div className="relative inline-block mb-6">
                <Shield className="w-20 h-20 text-gray-600" />
                <div className="absolute inset-0 blur-2xl bg-neon-cyan/5" />
              </div>
              <p className="text-gray-400 font-display text-lg">Enter a package to check</p>
              <p className="text-sm text-gray-600 mt-2 font-mono">
                The CI agent will verify against active incidents and attestations
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="w-20 h-20 border-2 border-neon-cyan/20 rounded-full animate-spin-slow" />
                <div className="absolute inset-2 border-2 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="w-8 h-8 text-neon-cyan" />
                </div>
              </div>
              <p className="text-gray-400 font-mono mt-6">Analyzing package security...</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {/* Main Decision */}
              <div className={`p-6 rounded-xl border relative overflow-hidden ${
                result.allowed 
                  ? 'bg-neon-green/5 border-neon-green/30' 
                  : 'bg-neon-pink/5 border-neon-pink/30'
              }`}>
                {/* Glow effect */}
                <div className={`absolute top-0 left-0 right-0 h-px ${
                  result.allowed 
                    ? 'bg-gradient-to-r from-transparent via-neon-green to-transparent' 
                    : 'bg-gradient-to-r from-transparent via-neon-pink to-transparent'
                }`} />
                
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    result.allowed 
                      ? 'bg-neon-green/20 shadow-[0_0_30px_rgba(57,255,20,0.3)]' 
                      : 'bg-neon-pink/20 shadow-[0_0_30px_rgba(255,0,85,0.3)]'
                  }`}>
                    {result.allowed ? (
                      <CheckCircle className="w-8 h-8 text-neon-green" />
                    ) : (
                      <XCircle className="w-8 h-8 text-neon-pink" />
                    )}
                  </div>
                  <div>
                    <p className={`text-2xl font-display font-bold tracking-wider ${
                      result.allowed ? 'text-neon-green glow-text-green' : 'text-neon-pink glow-text-pink'
                    }`}>
                      {result.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </p>
                    <p className="text-sm text-gray-400 font-mono">
                      {packageName}@{version}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{result.reason}</p>
              </div>

              {/* Blocking Incidents */}
              {result.blocking_incidents.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-3 font-mono tracking-wider">Blocking Incidents</p>
                  <div className="space-y-2">
                    {result.blocking_incidents.map(incId => (
                      <div
                        key={incId}
                        className="flex items-center gap-3 p-4 glass-panel border-neon-pink/20"
                      >
                        <AlertTriangle className="w-5 h-5 text-neon-pink" />
                        <span className="text-sm text-gray-400 font-mono">{incId.slice(0, 16)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Credentials */}
              {result.required_credentials.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-3 font-mono tracking-wider">Required Credentials</p>
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
                  <p className="text-[10px] text-gray-500 uppercase mb-3 font-mono tracking-wider">Attestations Found</p>
                  <div className="space-y-2">
                    {result.attestations.map(att => (
                      <div
                        key={att.id}
                        className={`p-4 rounded-xl border backdrop-blur-sm ${
                          att.valid 
                            ? 'bg-neon-green/5 border-neon-green/30' 
                            : 'bg-neon-pink/5 border-neon-pink/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {att.valid ? (
                              <CheckCircle className="w-5 h-5 text-neon-green" />
                            ) : (
                              <XCircle className="w-5 h-5 text-neon-pink" />
                            )}
                            <span className="text-sm text-gray-300 font-mono">
                              {att.issuer.split(':').pop()}
                            </span>
                          </div>
                          <Badge variant={att.valid ? 'success' : 'warning'}>
                            {att.reason}
                          </Badge>
                        </div>
                        {att.expires && (
                          <p className="text-[10px] text-gray-600 mt-2 font-mono">
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
