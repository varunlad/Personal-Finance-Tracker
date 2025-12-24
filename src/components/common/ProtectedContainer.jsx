
import AppContainer from '../layout/AppContainer'
import { useAuth } from '../../context/auth-context'
import AuthGate from '../auth/AuthGate'

export default function ProtectedContainer({ children }) {
  const { user } = useAuth()
  if (!user) return <AuthGate />
  return <AppContainer>{children}</AppContainer>
}
