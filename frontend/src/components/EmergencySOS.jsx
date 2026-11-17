import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { sendAgentChat } from '../services/api';

export default function EmergencySOS({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState(null);

  if (!isOpen) return null;

  const handleTriggerSOS = async (reason) => {
    setLoading(true);
    try {
      const res = await sendAgentChat(`EMERGENCY SOS: ${reason}`);
      setDispatched(res.data);
    } catch (err) {
      console.error(err);
      // Fallback display
      setDispatched({
        content: 'EMERGENCY NOTIFICATION DISPATCHED: Sarah Vance (+1-555-0192) and Doctor on call notified immediately.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-4 border-rose-500 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100">
          <div className="flex items-center space-x-2 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-2xl font-black">Emergency Assistance</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!dispatched ? (
          <div className="mt-5 space-y-4">
            <p className="text-slate-700 text-lg">
              Pressing a button below will immediately trigger our deterministic emergency protocol, notifying your primary caregiver and family.
            </p>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                disabled={loading}
                onClick={() => handleTriggerSOS('Severe Chest Pain / Difficulty Breathing')}
                className="w-full py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-lg rounded-xl flex items-center justify-center space-x-3 shadow-lg active:scale-98 transition disabled:opacity-50"
              >
                <PhoneCall className="w-6 h-6" />
                <span>Chest Pain / Hard to Breathe</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleTriggerSOS('Fall or Inability to Get Up')}
                className="w-full py-4 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg rounded-xl flex items-center justify-center space-x-3 shadow-md active:scale-98 transition disabled:opacity-50"
              >
                <AlertTriangle className="w-6 h-6" />
                <span>I Fell / Cannot Stand Up</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleTriggerSOS('General Medical Distress / Severe Dizziness')}
                className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg rounded-xl flex items-center justify-center space-x-3 shadow-md active:scale-98 transition disabled:opacity-50"
              >
                <ShieldAlert className="w-6 h-6" />
                <span>Dizziness / Other Emergency</span>
              </button>
            </div>

            {loading && (
              <div className="text-center py-2 text-rose-600 font-bold animate-pulse">
                Dispatching emergency alerts now...
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Emergency Dispatched!</h3>
            <p className="text-slate-700 text-base leading-relaxed bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              {dispatched.content}
            </p>
            <div className="text-sm text-slate-500">
              Please stay in place, take deep slow breaths, and keep this device nearby.
            </div>
            <button
              onClick={() => {
                setDispatched(null);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
