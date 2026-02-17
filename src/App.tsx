import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import RoleRouter from './components/RoleRouter'; // <--- OJO: Sin llaves { }
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