// const API_BASE = '/api'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export interface Incident {
  id: string
  package_name: string
  version: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'detected' | 'verified' | 'false_positive' | 'mitigated'
  title: string
  description: string
  indicators: RiskIndicator[]
  affected_projects: string[]
  credentials: string[]
  created_at: string
  updated_at: string
}

export interface RiskIndicator {
  type: string
  description: string
  confidence: number
  evidence?: string
}

export interface Credential {
  id: string
  type: string
  issuer_did: string
  subject: Record<string, unknown>
  issuance_date: string
  expiration_date?: string
  claims: Record<string, unknown>
  proof: {
    type: string
    signature: string
    verificationMethod: string
  }
}

export interface Agent {
  id: string
  did: string
  name: string
  capabilities: string[]
  endpoint?: string
  last_seen: string
  status: string
}

export interface CICheckResult {
  allowed: boolean
  reason: string
  required_credentials: string[]
  blocking_incidents: string[]
  attestations: Array<{
    id: string
    issuer: string
    valid: boolean
    reason: string
    expires?: string
  }>
}

export interface CredentialVerification {
  credential_id: string
  signature_valid: boolean
  issuer_verified: boolean
  issuer_did: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getIncidents: () => request<Incident[]>('/incidents'),
  
  getIncident: (id: string) => request<Incident>(`/incidents/${id}`),
  
  getCredentials: (incidentId?: string) => 
    request<Credential[]>(`/credentials${incidentId ? `?incident_id=${incidentId}` : ''}`),
  
  getCredential: (id: string) => request<Credential>(`/credentials/${id}`),
  
  verifyCredential: (id: string) => 
    request<CredentialVerification>(`/credentials/${id}/verify`),
  
  getAgents: () => request<Agent[]>('/agents'),
  
  triggerDemo: (packageName: string, scenario: string) =>
    request<{ incident_id: string; message: string }>('/demo/trigger', {
      method: 'POST',
      body: JSON.stringify({ package_name: packageName, scenario }),
    }),
  
  seedDemo: () => request<{ message: string }>('/demo/seed', { method: 'POST' }),
  
  checkCI: (projectId: string, packageName: string, version: string) =>
    request<CICheckResult>('/ci/check-update', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        package_name: packageName,
        version,
      }),
    }),
}
