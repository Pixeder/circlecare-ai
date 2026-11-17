import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, CheckCircle, User, Phone, AlertCircle, ShieldCheck } from 'lucide-react';

export default function OnboardingModal({ isOpen, onClose }) {
  const { user, createPatientProfile } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRel, setContactRel] = useState('Daughter');
  const [allergiesStr, setAllergiesStr] = useState('');
  const [conditionsStr, setConditionsStr] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide the patient name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const emergencyContacts = [];
      if (contactName.trim() && contactPhone.trim()) {
        emergencyContacts.push({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          relationship: contactRel,
          isPrimary: true,
        });
      }

      const allergies = allergiesStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const chronicConditions = conditionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createPatientProfile({
        name: name.trim(),
        dateOfBirth,
        gender,
        phone: phone.trim(),
        emergencyContacts,
        allergies,
        chronicConditions,
        bloodType,
      });

      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to save patient profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-7 shadow-2xl border border-slate-100 my-8">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-2 font-bold">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Welcome to CareCircle AI</h2>
          <p className="text-xs text-slate-500 mt-1">
            Let's set up your primary elderly patient profile to enable medication scheduling and intelligent AI assistance.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Blood Group
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Patient Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1-555-0133"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-xs block">Primary Emergency Contact</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact Name (e.g. Sarah Vance)"
                className="p-2 border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone (+1-555-0192)"
                className="p-2 border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="text"
                value={contactRel}
                onChange={(e) => setContactRel(e.target.value)}
                placeholder="Relationship (Daughter)"
                className="p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Known Drug Allergies (comma-separated)
            </label>
            <input
              type="text"
              value={allergiesStr}
              onChange={(e) => setAllergiesStr(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Aspirin"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Chronic Medical Diagnoses (comma-separated)
            </label>
            <input
              type="text"
              value={conditionsStr}
              onChange={(e) => setConditionsStr(e.target.value)}
              placeholder="e.g. Essential Hypertension, Type 2 Diabetes Mellitus"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Creating Profile...' : 'Save & Enter Dashboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
