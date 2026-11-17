async function probe() {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer mock-token',
    'x-patient-id': 'patient_elderly_001',
  };

  console.log('--- Probing SOS Endpoint ---');
  const sosRes = await fetch('http://localhost:5000/api/emergency/sos', {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: 'Severe dizziness and fall in living room', urgency: 'critical' }),
  });
  console.log('SOS HTTP Status:', sosRes.status);
  const sosData = await sosRes.json();
  console.log('SOS Response:', JSON.stringify(sosData, null, 2));

  console.log('\n--- Probing Doctor Brief Endpoint ---');
  const briefRes = await fetch('http://localhost:5000/api/medical-history/doctor-brief?focusArea=Cardiovascular', {
    headers,
  });
  console.log('Doctor Brief Status:', briefRes.status);
  const briefData = await briefRes.json();
  console.log('Doctor Brief Adherence:', briefData.adherenceRate);
  console.log('Doctor Brief Active Meds:', briefData.activeMedications);

  console.log('\n--- Probing Prescriptions List Endpoint ---');
  const rxRes = await fetch('http://localhost:5000/api/prescriptions', { headers });
  console.log('Prescriptions Status:', rxRes.status);
  const rxData = await rxRes.json();
  console.log('Prescriptions Count:', rxData.count);

  console.log('\n--- Probing Refill Request Endpoint ---');
  const refillRes = await fetch('http://localhost:5000/api/medications/refill', {
    method: 'POST',
    headers,
    body: JSON.stringify({ medicationName: 'Amlodipine', quantityRequested: 30 }),
  });
  console.log('Refill Request Status:', refillRes.status);
  const refillData = await refillRes.json();
  console.log('Refill Message:', refillData.message);
}

probe().catch(console.error);
