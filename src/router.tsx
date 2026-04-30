import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Comptabilite from './pages/Comptabilite';
import Agenda from './pages/Agenda';
import Demandes from './pages/Demandes';
import GED from './pages/GED';
import Facturation from './pages/Facturation';
import Parametres from './pages/Parametres';
import { useAuth } from './contexts/AuthContext';
import RouteError from './components/RouteError';

// Simple loading spinner
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-green-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 shadow-md"></div>
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children?: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && userProfile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
    errorElement: <RouteError />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'comptabilite',
        element: <Comptabilite />,
      },
      {
        path: 'agenda',
        element: <Agenda />,
      },
      {
        path: 'demandes',
        element: <Demandes />,
      },
      {
        path: 'ged',
        element: <GED />,
      },
      {
        path: 'facturation',
        element: <Facturation />,
      },
      {
        path: 'parametres',
        element: <ProtectedRoute adminOnly />,
        children: [
          {
            index: true,
            element: <Parametres />,
          },
        ],
      },
    ],
  },
]);
