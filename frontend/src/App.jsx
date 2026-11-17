import React, { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main 9-Tab Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        counts={{
          prescriptions: 2,
          appointments: 2,
          caregivers: 3,
          lowStock: 1,
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onRefreshNeeded={refreshTrigger}
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

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        CareCircle AI • Elderly Healthcare & Family Circle Agent Platform • Powered by NVIDIA NIM Mistral Large, MongoDB Atlas & Qdrant RAG
      </footer>
    </div>
  );
}
