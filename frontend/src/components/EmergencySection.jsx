import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  ShieldAlert,
  CheckCircle,
  Clock,
  Phone,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { fetchEmergencyContacts, triggerEmergencySOS, resolveEmergencySOS } from '../services/api';

export default function EmergencySection() {
  const [contacts, setContacts] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [customReason, setCustomReason] = useState('Patient reported fall or acute clinical distress');

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await fetchEmergencyContacts();
      setContacts(res.contacts || []);
      if (res.activeEmergency) {
        setActiveEmergency(res.activeEmergency);
      }
    } catch (err) {
      console.warn('Error loading contacts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleTriggerSOS = async () => {
    if (!window.confirm('CRITICAL ACTION: Trigger emergency SOS alert to Sarah Vance and emergency contacts now?')) {
      return;
    }

    try {
      setTriggering(true);
      const res = await triggerEmergencySOS(customReason, 'critical');
      setActiveEmergency(res.activeEmergency || {
        triggeredAt: new Date().toISOString(),
        reason: customReason,
        status: 'DISPATCHED',
      });
      alert('EMERGENCY SOS DISPATCHED: Sarah Vance and primary care contacts have been alerted.');
    } catch (err) {
      alert(`SOS error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleResolve = async () => {
    try {
      await resolveEmergencySOS();
      setActiveEmergency(null);
      alert('Emergency marked as resolved and safely closed.');
    } catch (err) {
      alert(`Resolve error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Emergency Status Banner */}
      {activeEmergency ? (
        <div className="bg-rose-700 text-white rounded-2xl p-6 shadow-xl border-2 border-rose-500 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-7 h-7 text-white" />
                <h2 className="text-2xl font-black tracking-tight">ACTIVE EMERGENCY DISPATCHED</h2>
              </div>
              <p className="text-rose-100 text-sm mt-1 max-w-xl">
                Reason: "{activeEmergency.reason}" • Triggered at {new Date(activeEmergency.triggeredAt).toLocaleTimeString()}
              </p>
              <p className="text-xs text-rose-200 mt-2 font-semibold">
                Deterministic Emergency Protocol engaged. Sarah Vance (+1-555-0192) and Dr. Miller notified.
              </p>
            </div>

            <button
              onClick={handleResolve}
              className="px-5 py-2.5 bg-white text-rose-900 hover:bg-rose-50 rounded-xl font-black text-sm shadow-md transition"
            >
              Mark Situation Resolved
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-6 text-white shadow-md">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-rose-600 rounded-xl text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Deterministic Emergency SOS Protocol</h1>
              <p className="text-xs text-rose-200">
                Direct fail-safe emergency dispatch. Bypasses stochastic LLM reasoning for instant human contact.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Large SOS Trigger Panel */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Press for Immediate Medical Assistance</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Pressing the SOS button immediately alerts designated family caregiver Sarah Vance, physician contacts, and emergency services.
        </p>

        <div className="max-w-md mx-auto mb-6">
          <label className="text-xs font-semibold text-slate-600 block mb-1 text-left">
            Emergency Reason / Symptoms (Optional)
          </label>
          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-rose-500"
            placeholder="e.g. Chest tightness, sudden fall, severe dizziness"
          />
        </div>

        <button
          disabled={triggering}
          onClick={handleTriggerSOS}
          className="w-48 h-48 mx-auto rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex flex-col items-center justify-center shadow-2xl shadow-rose-300 transition border-8 border-rose-100 disabled:opacity-50"
        >
          <PhoneCall className="w-14 h-14 animate-bounce mb-2" />
          <span className="text-2xl font-black tracking-wider">TRIGGER SOS</span>
          <span className="text-[11px] font-semibold text-rose-200 uppercase mt-1">One-Touch Dispatch</span>
        </button>
      </div>

      {/* Configured Emergency Contacts */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Verified Emergency Contact Directory</h3>
            <p className="text-xs text-slate-500">
              Deterministic priority sequence notified in case of SOS trigger.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
            {contacts.length} Contacts
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {contacts.map((c, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                  {c.isPrimary && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{c.relationship}</p>
                <p className="text-xs font-mono font-bold text-teal-700 mt-2 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {c.phone}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Critical Emergency Card */}
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Paramedic Emergency Reference Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-900">
          <div>
            <strong>Known Allergies:</strong>
            <p className="font-bold text-rose-700">Penicillin, Sulfa drugs</p>
          </div>
          <div>
            <strong>Chronic Diagnoses:</strong>
            <p>Essential Hypertension, Type 2 Diabetes</p>
          </div>
          <div>
            <strong>Active Medications:</strong>
            <p>Metformin 500mg BID, Amlodipine 5mg QD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
