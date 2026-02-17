import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleRouter } from './components/RoleRouter';
import { DataProvider } from './context/DataContext'; // Si usas contexto de datos
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          {/* RoleRouter decide qué mostrar: Login o el Dashboard del rol específico */}
          <RoleRouter />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;