import React, { useState, useEffect } from 'react';
import { Pill, Check, AlertCircle, RefreshCw, AlertTriangle, Clock, ShoppingCart } from 'lucide-react';
import { fetchMedications, logDose, requestMedicationRefill } from '../services/api';

export default function MedicationList({ refreshTrigger, onDoseLogged }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadMeds = async () => {
    try {
      setLoading(true);
      const res = await fetchMedications();
      if (res.medications) {
        setMedications(res.medications);
      }
    } catch (err) {
      console.warn('Using default medications view:', err.message);
      setMedications([
        {
          id: 'med_1',
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily with meals (08:00, 20:00)',
          instructions: 'Take with food to minimize GI distress',
          stockRemaining: 18,
          refillThreshold: 5,
          refillNeeded: false,
          timing: ['08:00 AM', '08:00 PM'],
        },
        {
          id: 'med_2',
          name: 'Amlodipine',
          dosage: '5mg',
          frequency: 'Once daily in morning (08:00)',
          instructions: 'Take in the morning with water for blood pressure',
          stockRemaining: 4,
          refillThreshold: 5,
          refillNeeded: true,
          timing: ['08:00 AM'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeds();
  }, [refreshTrigger]);

  const handleTakeDose = async (medName) => {
    try {
      const res = await logDose(medName, 'taken', 'Logged via CareCircle Portal');
      setActionMessage(`Marked ${medName} as taken! Remaining pills: ${res.remainingStock}`);
      loadMeds();
      if (onDoseLogged) onDoseLogged(medName);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleRefill = async (medName) => {
    try {
      const res = await requestMedicationRefill(medName, 30);
      setActionMessage(res.message);
      loadMeds();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      alert(`Refill request error: ${err.message}`);
    }
  };

  const filteredMeds = medications.filter((m) => {
    if (activeFilter === 'low_stock') return (m.stockRemaining ?? 30) <= (m.refillThreshold ?? 5) || m.refillNeeded;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Medication Regimen & Inventory</h2>
            <p className="text-xs text-slate-500">Authorized prescription schedule and automated refill tracking</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                activeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({medications.length})
            </button>
            <button
              onClick={() => setActiveFilter('low_stock')}
              className={`px-3 py-1 rounded-lg transition ${
                activeFilter === 'low_stock' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Low Stock
            </button>
          </div>

          <button
            onClick={loadMeds}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        {filteredMeds.map((med) => {
          const isLowStock = (med.stockRemaining ?? 30) <= (med.refillThreshold ?? 5) || med.refillNeeded;

          return (
            <div
              key={med.id || med.name}
              className={`p-4 rounded-xl border transition ${
                isLowStock ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-slate-50/50'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-base">{med.name}</span>
                  <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-0.5 rounded-md">
                    {med.dosage}
                  </span>
                  {isLowStock && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Refill Threshold Reached
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {med.frequency} • Timing: {(med.timing || ['08:00 AM']).join(', ')}
                </p>

                {med.instructions && (
                  <p className="text-xs text-slate-500 italic">Instructions: {med.instructions}</p>
                )}

                <div className="text-xs text-slate-600 flex items-center gap-2 pt-1">
                  <span>Supply Remaining:</span>
                  <strong className={`font-mono text-sm ${isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                    {med.stockRemaining ?? 18} tablets
                  </strong>
                  <span className="text-[11px] text-slate-400">
                    (Refill alert triggered at ≤ {med.refillThreshold ?? 5} units)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleTakeDose(med.name)}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Log Taken</span>
                </button>

                {isLowStock && (
                  <button
                    onClick={() => handleRefill(med.name)}
                    className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Request Refill</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredMeds.length === 0 && !loading && (
          <p className="text-sm text-slate-500 text-center py-6">No medications matching current filter.</p>
        )}
      </div>
    </div>
  );
}
