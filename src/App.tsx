import React from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import RoleRouter from './components/RoleRouter';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" closeButton />
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <RoleRouter />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;