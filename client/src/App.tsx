import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DemoBanner } from './components/DemoBanner';
import { EmergencyRequestModal } from './components/EmergencyRequestModal';

import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { LoginPage } from './pages/LoginPage';
import { DonorRegisterPage } from './pages/DonorRegisterPage';
import { RequesterRegisterPage } from './pages/RequesterRegisterPage';
import { DonorDashboard } from './pages/DonorDashboard';
import { RequesterDashboard } from './pages/RequesterDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

// Route Guard Component
const ProtectedRoute: React.FC<{
  allowedRoles?: string[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-xs text-gray-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'donor') return <Navigate to="/donor/dashboard" replace />;
    return <Navigate to="/requester/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <DemoBanner />
      <Navbar onOpenRequestModal={() => setIsEmergencyModalOpen(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/donor" element={<DonorRegisterPage />} />
          <Route path="/register/requester" element={<RequesterRegisterPage />} />

          {/* Protected Role Dashboards */}
          <Route
            path="/donor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requester/dashboard"
            element={
              <ProtectedRoute allowedRoles={['requester']}>
                <RequesterDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      <EmergencyRequestModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
