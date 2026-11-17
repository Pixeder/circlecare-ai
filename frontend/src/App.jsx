import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Header from './components/Header';
import Navigation from './components/Navigation';
import OverviewDashboard from './components/OverviewDashboard';
import AgentChat from './components/AgentChat';
import PrescriptionSection from './components/PrescriptionSection';
import MedicationList from './components/MedicationList';
import AppointmentsSection from './components/AppointmentsSection';
import MedicalHistorySection from './components/MedicalHistorySection';
import FamilyCareSection from './components/FamilyCareSection';
import EmergencySection from './components/EmergencySection';
import SettingsSection from './components/SettingsSection';
import EmergencySOS from './components/EmergencySOS';
import OnboardingModal from './components/OnboardingModal';

function MainApp() {
  const { user, patientProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // If newly authenticated user has no patient profile yet, open onboarding modal
  const needsOnboarding = user && !patientProfile && !isOnboardingOpen;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Main 9-Tab Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onRefreshNeeded={refreshTrigger}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        )}

        {activeTab === 'assistant' && (
          <div className="max-w-4xl mx-auto">
            <AgentChat onToolActionCompleted={handleRefresh} />
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <PrescriptionSection onPrescriptionUpdated={handleRefresh} />
        )}

        {activeTab === 'medications' && (
          <div className="max-w-4xl mx-auto">
            <MedicationList
              refreshTrigger={refreshTrigger}
              onDoseLogged={handleRefresh}
            />
          </div>
        )}

        {activeTab === 'appointments' && (
          <AppointmentsSection />
        )}

        {activeTab === 'history' && (
          <MedicalHistorySection />
        )}

        {activeTab === 'family' && (
          <FamilyCareSection />
        )}

        {activeTab === 'emergency' && (
          <EmergencySection />
        )}

        {activeTab === 'settings' && (
          <SettingsSection />
        )}
      </main>

      {/* Global Quick Emergency SOS Modal */}
      <EmergencySOS
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      {/* Onboarding Modal for New Accounts */}
      <OnboardingModal
        isOpen={isOnboardingOpen || Boolean(needsOnboarding)}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        CareCircle AI • Real Firebase Authentication & MongoDB Dynamic Persistence • Powered by NVIDIA NIM Mistral Large & Qdrant RAG
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
