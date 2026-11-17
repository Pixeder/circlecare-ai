import React, { useState, useEffect } from 'react';
import {
  Users,
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { fetchCaregivers, fetchFamilyActivity, fetchFamilyAlerts, sendFamilyAlert, acknowledgeFamilyAlert } from '../services/api';

export default function FamilyCareSection() {
  const [caregivers, setCaregivers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Alert Form State
  const [alertType, setAlertType] = useState('refill_needed');
  const [severity, setSeverity] = useState('medium');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cgRes, actRes, altRes] = await Promise.all([
        fetchCaregivers(),
        fetchFamilyActivity(),
        fetchFamilyAlerts(),
      ]);
      setCaregivers(cgRes.caregivers || []);
      setActivities(actRes.activities || []);
      setAlerts(altRes.alerts || []);
    } catch (err) {
      console.warn('Error loading family data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setSubmitting(true);
      const res = await sendFamilyAlert({ type: alertType, severity, message });
      setSuccessBanner(res.message);
      setIsAlertModalOpen(false);
      setMessage('');
      loadAll();
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      alert(`Error sending alert: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeFamilyAlert(alertId);
      setSuccessBanner('Caregiver acknowledgement recorded.');
      loadAll();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Family & Caregiver Support Circle</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time collaboration between Eleanor, daughter Sarah Vance, family proxies, and visiting home nurse.
          </p>
        </div>

        <button
          onClick={() => setIsAlertModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow transition"
        >
          <Bell className="w-4 h-4" />
          <span>Dispatch Caregiver Alert</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Active Alerts Awaiting Caregiver Acknowledgement */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Active Caregiver Alerts
          </h3>
          <div className="space-y-2.5">
            {alerts.map((alt) => (
              <div
                key={alt._id}
                className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-sm flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                      {alt.severity} Urgency
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(alt.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-semibold mt-1">{alt.message}</p>
                </div>

                <div>
                  {alt.acknowledged ? (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <UserCheck className="w-4 h-4" /> Acknowledged by {alt.acknowledgedBy || 'Caregiver'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(alt._id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition"
                    >
                      Acknowledge & Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caregiver Directory Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Authorized Caregiver Circle</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {caregivers.map((cg) => (
            <div
              key={cg.caregiverId}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl">{cg.avatar}</div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {cg.status.toUpperCase()}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{cg.name}</h4>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">{cg.relationship}</p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cg.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{cg.email}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Access Level: <strong className="text-slate-700">{cg.accessLevel.replace(/_/g, ' ')}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Last active: {cg.lastActive}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Care Activity Stream */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Healthcare Activity Feed</h3>
            <p className="text-xs text-slate-500">Automatic audit log of dose tracking, verifications, and agent actions.</p>
          </div>
          <span className="text-xs text-teal-600 font-semibold">Live Audit Trail</span>
        </div>

        <div className="mt-4 space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3 text-xs"
            >
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-teal-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{act.title}</span>
                  <span className="text-slate-400">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-600 mt-0.5">{act.description}</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Actor: {act.actor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Dispatch Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Dispatch Caregiver Alert</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send an urgent notification directly to Sarah Vance and Eleanor's healthcare circle.
            </p>

            <form onSubmit={handleSendAlert} className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Alert Category</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="refill_needed">Medicine Refill Needed</option>
                  <option value="missed_medication">Missed Medication Dose</option>
                  <option value="vital_anomaly">Vital Sign / Blood Pressure Anomaly</option>
                  <option value="general">General Caregiver Update</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Urgency Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="low">Low (General update)</option>
                  <option value="medium">Medium (Action recommended)</option>
                  <option value="high">High (Prompt caregiver attention needed)</option>
                  <option value="critical">Critical (Immediate response)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Message</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Eleanor mentioned feeling slightly dizzy after morning Metformin. BP reading was 132/86."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="mt-4 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
