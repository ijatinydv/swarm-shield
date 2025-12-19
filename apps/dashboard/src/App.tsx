import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/IncidentDetail'
import Agents from './pages/Agents'
import CIGate from './pages/CIGate'
import Landing from './pages/Landing'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/app" element={<Layout><Dashboard /></Layout>} />
        <Route path="/incidents" element={<Layout><Incidents /></Layout>} />
        <Route path="/incidents/:id" element={<Layout><IncidentDetail /></Layout>} />
        <Route path="/agents" element={<Layout><Agents /></Layout>} />
        <Route path="/ci-gate" element={<Layout><CIGate /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
