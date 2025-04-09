import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './components/AuthProvider';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { PersonalExpensesPage } from './pages/PersonalExpensesPage';
import ProfilePage from './pages/ProfilePage';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="personal-expenses" element={<PersonalExpensesPage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;