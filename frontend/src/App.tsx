import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import { useWebSocket } from './hooks/useWebSocket'

export default function App() {
  const connect = useWebSocket()
  useEffect(() => { connect() }, [connect])
  return <AppShell />
}
