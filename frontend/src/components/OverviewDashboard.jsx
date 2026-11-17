import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  Upload,
  PhoneCall,
  User,
  Activity,
  PlusCircle,
  FilePlus,
  Users,
} from 'lucide-react';
import { fetchOverview, logDose, requestMedicationRefill } from '../services/api';

export default function OverviewDashboard({ onNavigate, onOpenEmergency, onRefreshNeeded, onOpenOnboarding }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchOverview();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [onRefreshNeeded]);

  const handleTakeDose = async (medName) => {
    try {
      await logDose(medName, 'taken', 'Marked taken from Overview Dashboard');
      setActionMessage(`Logged ${medName} dose as taken!`);
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err) {
      alert(`Error logging dose: ${err.message}`);
    }
  };

  const handleRefill = async (medName) => {
    try {
      const res = await requestMedicationRefill(medName, 30);
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 5000);
      loadData();
    } catch (err) {
      alert(`Error requesting refill: ${err.message}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm font-semibold text-slate-600">Loading healthcare dashboard...</span>
      </div>
    );
  }

  // Handle brand new user with NO patient profile
  if (!data || !data.hasPatientProfile || !data.patient) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl text-center max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <HeartPulse className="w-9 h-9 text-teal-300" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to CareCircle AI</h1>
          <p className="text-sm text-teal-100 max-w-lg mx-auto mt-2 leading-relaxed">
            You don't have an active patient profile set up yet. Create your patient profile to start tracking medications, processing prescriptions with AI, and monitoring adherence.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenOnboarding}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Patient Profile Now</span>
            </button>
            <button
              onClick={() => onNavigate('prescriptions')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Prescription</span>
            </button>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <div
            onClick={onOpenOnboarding}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-400 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. Patient Profile</h3>
            <p className="text-xs text-slate-500 mt-1">Add name, emergency contacts, conditions, and allergies.</p>
          </div>

          <div
            onClick={() => onNavigate('prescriptions')}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-400 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
              <FilePlus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. AI Prescription OCR</h3>
            <p className="text-xs text-slate-500 mt-1">Upload a doctor slip to extract and verify instructions.</p>
          </div>

          <div
            onClick={() => onNavigate('family')}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-400 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Invite Caregivers</h3>
            <p className="text-xs text-slate-500 mt-1">Share access with family members or visiting nurses.</p>
          </div>
        </div>
      </div>
    );
  }

  const patient = data.patient;
  const quickStats = data.quickStats || {
    activeMedicationsCount: 0,
    adherenceRate: '0%',
    lowStockCount: 0,
    nextDoctorVisit: 'None scheduled',
  };
  const todaySchedule = data.todaySchedule || [];
  const upcomingAppointment = data.upcomingAppointment;
  const lowStockWarnings = data.lowStockWarnings || [];

  return (
    <div className="space-y-6">
      {/* Patient Greeting & Status Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Active Patient Profile
              </span>
              <span className="text-xs text-teal-200">ID: #{patient.patientId}</span>
            </div>
            <h1 className="text-2xl font-bold mt-1">Hello, {patient.name}!</h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-2xl">
              {patient.dateOfBirth && `DOB: ${patient.dateOfBirth} • `}
              {patient.chronicConditions?.length > 0
                ? `Conditions: ${patient.chronicConditions.join(', ')}`
                : 'No chronic conditions recorded'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('assistant')}
              className="flex items-center space-x-1.5 bg-white text-teal-900 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow transition"
            >
              <Bot className="w-4 h-4 text-teal-600" />
              <span>Ask Assistant</span>
            </button>
            <button
              onClick={onOpenEmergency}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition animate-pulse"
            >
              <PhoneCall className="w-4 h-4" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherence Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dose Adherence (30d)</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{quickStats.adherenceRate}</div>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5" /> Calculated from logs
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>

        {/* Active Meds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Medications</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{quickStats.activeMedicationsCount}</div>
            <span className="text-xs text-slate-500 font-medium">Prescribed & verified</span>
          </div>
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('medications')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low-Stock Warning</span>
            <div className={`text-2xl font-bold mt-1 ${quickStats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {quickStats.lowStockCount}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {quickStats.lowStockCount > 0 ? 'Refill recommended' : 'Supplies adequate'}
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Next Visit */}
        <div
          onClick={() => onNavigate('appointments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-400 transition"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Doctor Visit</span>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[170px]">
              {upcomingAppointment?.doctorName || 'None scheduled'}
            </div>
            <span className="text-xs text-teal-600 font-medium">
              {upcomingAppointment ? `${upcomingAppointment.date} (${upcomingAppointment.time})` : 'Schedule a checkup'}
            </span>
          </div>
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Schedule (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Today's Medication Schedule</h2>
            </div>
            <button
              onClick={() => onNavigate('medications')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
            >
              Full Schedule <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {todaySchedule.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No active medications scheduled</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Upload a doctor's prescription slip or ask the AI assistant to add your daily medications.
                </p>
                <button
                  onClick={() => onNavigate('prescriptions')}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Upload First Prescription
                </button>
              </div>
            ) : (
              todaySchedule.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base">{med.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                        {med.dosage}
                      </span>
                      {med.stockRemaining <= med.refillThreshold && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {med.stockRemaining} left
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Frequency: {med.frequency} • Scheduled: {med.nextDose || 'Daily'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTakeDose(med.name)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Log Taken</span>
                    </button>
                    {med.stockRemaining <= med.refillThreshold && (
                      <button
                        onClick={() => handleRefill(med.name)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        Request Refill
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Emergency Contacts & Quick Doctor Visit Brief (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Contacts Summary */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">Emergency Contacts</h3>
              </div>
              <button
                onClick={() => onNavigate('emergency')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
              >
                Manage
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {(patient.emergencyContacts || []).length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No emergency contacts configured.</p>
                  <button
                    onClick={() => onNavigate('emergency')}
                    className="mt-2 text-xs text-teal-600 font-bold hover:underline"
                  >
                    + Add Emergency Contact
                  </button>
                </div>
              ) : (
                patient.emergencyContacts.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{c.name}</span>
                      <span className="text-[11px] text-slate-500">{c.relationship} • {c.phone}</span>
                    </div>
                    {c.isPrimary && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Doctor Visit Preparation Banner */}
          <div className="bg-gradient-to-br from-cyan-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Doctor Visit Brief Generator
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Synthesize 30-day medication adherence, vital trends, and cited prescription source records for your next appointment.
            </p>
            <button
              onClick={() => onNavigate('history')}
              className="mt-3.5 w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Generate Doctor Visit Brief (Qdrant RAG)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
