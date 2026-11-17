import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { fetchAppointments, createAppointment, cancelAppointment } from '../services/api';

export default function AppointmentsSection() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Form State
  const [form, setForm] = useState({
    doctorName: '',
    specialty: 'Geriatrics & Primary Care',
    appointmentDate: '',
    appointmentTime: '10:00 AM',
    clinicLocation: 'Senior Wellness Clinic, Suite 204',
    reason: '',
    notes: '',
  });

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchAppointments();
      setAppointments(res.appointments || []);
    } catch (err) {
      console.warn('Error loading appointments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.doctorName || !form.appointmentDate || !form.appointmentTime) {
      alert('Please fill in doctor name, date, and time.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createAppointment(form);
      setSuccessBanner(res.message);
      setIsModalOpen(false);
      setForm({
        doctorName: '',
        specialty: 'Geriatrics & Primary Care',
        appointmentDate: '',
        appointmentTime: '10:00 AM',
        clinicLocation: 'Senior Wellness Clinic, Suite 204',
        reason: '',
        notes: '',
      });
      loadAppointments();
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      alert(`Error scheduling: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id, doctor) => {
    if (!window.confirm(`Are you sure you want to cancel the appointment with ${doctor}?`)) return;

    try {
      await cancelAppointment(id);
      setSuccessBanner(`Cancelled appointment with ${doctor}.`);
      loadAppointments();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      alert(`Error cancelling: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Physician Consultations & Appointments</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Schedule clinic checkups, track specialist visits, and generate pre-appointment doctor briefs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Appointments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-slate-500 text-sm">Loading appointment schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-sm">No scheduled appointments.</div>
        ) : (
          appointments.map((appt) => (
            <div
              key={appt._id || appt.appointmentId}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-teal-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    {appt.specialty}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      appt.status === 'scheduled'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {appt.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{appt.doctorName}</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{appt.reason}</p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>{new Date(appt.appointmentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>{appt.appointmentTime}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{appt.clinicLocation}</span>
                  </div>
                </div>

                {appt.notes && (
                  <p className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                    <strong>Prep Notes:</strong> {appt.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">ID: #{appt.appointmentId || appt._id?.slice(-6)}</span>
                <button
                  onClick={() => handleCancel(appt._id || appt.appointmentId, appt.doctorName)}
                  className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Book New Healthcare Appointment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Schedule with Eleanor's specialist or primary physician.
            </p>

            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Miller, FACC"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiology"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 AM"
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. BP Checkup"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Clinic Location</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Wellness Clinic, Suite 204"
                  value={form.clinicLocation}
                  onChange={(e) => setForm({ ...form, clinicLocation: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Bring fasting blood sugar and BP log"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="mt-4 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
