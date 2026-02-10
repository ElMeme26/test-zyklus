import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext'; // <--- IMPORTANTE
import { LoginScreen } from './components/LoginScreen';
import { RoleRouter } from './components/RoleRouter';
import { Toaster } from 'sonner';

function Content() {
  const { user } = useAuth();
  // Si hay usuario mostramos el Router, si no el Login
  return user ? <RoleRouter /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider> {/* <--- AGREGAMOS ESTO */}
        <Content />
        <Toaster position="top-center" theme="dark" />
      </DataProvider>
    </AuthProvider>
  );
}