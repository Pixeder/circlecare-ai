const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer mock-token',
  'x-patient-id': 'patient_elderly_001',
};

// 1. Overview & Patient Profile
export async function fetchOverview() {
  const response = await fetch(`${API_BASE}/patient/overview`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Overview error: ${response.statusText}`);
  return await response.json();
}

export async function fetchPatientProfile() {
  const response = await fetch(`${API_BASE}/patient/profile`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Profile error: ${response.statusText}`);
  return await response.json();
}

// 2. AI Healthcare Agent Chat
export async function sendAgentChat(message, messages = [], confirmedActions = []) {
  const response = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ message, messages, confirmedActions }),
  });
  if (!response.ok) throw new Error(`Agent error: ${response.statusText}`);
  return await response.json();
}

// 3. Medications & Stock
export async function fetchMedications() {
  const response = await fetch(`${API_BASE}/medications`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Medications error: ${response.statusText}`);
  return await response.json();
}

export async function logDose(medicationName, status = 'taken', notes = '') {
  const response = await fetch(`${API_BASE}/medications/log-dose`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ medicationName, status, notes }),
  });
  if (!response.ok) throw new Error(`Log dose error: ${response.statusText}`);
  return await response.json();
}

export async function checkMedicineStock() {
  const response = await fetch(`${API_BASE}/medications/stock`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Stock error: ${response.statusText}`);
  return await response.json();
}

export async function requestMedicationRefill(medicationName, quantityRequested = 30) {
  const response = await fetch(`${API_BASE}/medications/refill`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ medicationName, quantityRequested }),
  });
  if (!response.ok) throw new Error(`Refill error: ${response.statusText}`);
  return await response.json();
}

// 4. Prescriptions
export async function uploadPrescription(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/prescriptions/upload`, {
    method: 'POST',
    headers: {
      Authorization: defaultHeaders.Authorization,
      'x-patient-id': defaultHeaders['x-patient-id'],
    },
    body: formData,
  });
  if (!response.ok) throw new Error(`Upload error: ${response.statusText}`);
  return await response.json();
}

export async function verifyPrescription(prescriptionId, verifiedMedications) {
  const response = await fetch(`${API_BASE}/prescriptions/verify`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ prescriptionId, verifiedMedications }),
  });
  if (!response.ok) throw new Error(`Verification error: ${response.statusText}`);
  return await response.json();
}

export async function fetchPrescriptions() {
  const response = await fetch(`${API_BASE}/prescriptions`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Prescriptions list error: ${response.statusText}`);
  return await response.json();
}

// 5. Appointments
export async function fetchAppointments() {
  const response = await fetch(`${API_BASE}/appointments`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Appointments error: ${response.statusText}`);
  return await response.json();
}

export async function createAppointment(data) {
  const response = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Create appointment error: ${response.statusText}`);
  return await response.json();
}

export async function cancelAppointment(id) {
  const response = await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'DELETE',
    headers: defaultHeaders,
  });
  if (!response.ok) throw new Error(`Cancel appointment error: ${response.statusText}`);
  return await response.json();
}

// 6. Medical History & Doctor Brief (Qdrant RAG)
export async function fetchMedicalRecords() {
  const response = await fetch(`${API_BASE}/medical-history/records`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Medical records error: ${response.statusText}`);
  return await response.json();
}

export async function searchMedicalMemory(query, limit = 5) {
  const response = await fetch(`${API_BASE}/medical-history/search?query=${encodeURIComponent(query)}&limit=${limit}`, {
    headers: defaultHeaders,
  });
  if (!response.ok) throw new Error(`Memory search error: ${response.statusText}`);
  return await response.json();
}

export async function fetchDoctorBrief(focusArea = 'General Geriatric Review') {
  const response = await fetch(`${API_BASE}/medical-history/doctor-brief?focusArea=${encodeURIComponent(focusArea)}`, {
    headers: defaultHeaders,
  });
  if (!response.ok) throw new Error(`Doctor brief error: ${response.statusText}`);
  return await response.json();
}

// 7. Family Care & Alerts
export async function fetchCaregivers() {
  const response = await fetch(`${API_BASE}/family/caregivers`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Caregivers error: ${response.statusText}`);
  return await response.json();
}

export async function fetchFamilyActivity() {
  const response = await fetch(`${API_BASE}/family/activity`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Activity error: ${response.statusText}`);
  return await response.json();
}

export async function fetchFamilyAlerts() {
  const response = await fetch(`${API_BASE}/family/alerts`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Alerts error: ${response.statusText}`);
  return await response.json();
}

export async function sendFamilyAlert(alertData) {
  const response = await fetch(`${API_BASE}/family/alerts`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(alertData),
  });
  if (!response.ok) throw new Error(`Send alert error: ${response.statusText}`);
  return await response.json();
}

export async function acknowledgeFamilyAlert(id) {
  const response = await fetch(`${API_BASE}/family/alerts/${id}/acknowledge`, {
    method: 'PATCH',
    headers: defaultHeaders,
  });
  if (!response.ok) throw new Error(`Acknowledge alert error: ${response.statusText}`);
  return await response.json();
}

// 8. Emergency SOS
export async function fetchEmergencyContacts() {
  const response = await fetch(`${API_BASE}/emergency/contacts`, { headers: defaultHeaders });
  if (!response.ok) throw new Error(`Emergency contacts error: ${response.statusText}`);
  return await response.json();
}

export async function triggerEmergencySOS(reason = 'Emergency SOS triggered', urgency = 'critical') {
  const response = await fetch(`${API_BASE}/emergency/sos`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ reason, urgency }),
  });
  if (!response.ok) throw new Error(`SOS error: ${response.statusText}`);
  return await response.json();
}

export async function resolveEmergencySOS() {
  const response = await fetch(`${API_BASE}/emergency/resolve`, {
    method: 'POST',
    headers: defaultHeaders,
  });
  if (!response.ok) throw new Error(`Resolve SOS error: ${response.statusText}`);
  return await response.json();
}

// 9. Health & System
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Backend offline');
  return await response.json();
}
