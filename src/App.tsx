import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import RoleRouter from './components/RoleRouter'; 
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <RoleRouter />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;