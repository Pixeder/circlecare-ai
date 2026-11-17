import '../config/env.js';
import assert from 'assert';
import { connectMongoDB, isMongoConnected } from '../config/mongodb.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Medication } from '../models/Medication.js';
import { Prescription } from '../models/Prescription.js';
import { Caregiver } from '../models/Caregiver.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import { defaultOrchestrator } from '../agent/orchestrator.js';

function generateTestToken(uid, email, expSeconds = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: uid,
      user_id: uid,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expSeconds,
    })
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

async function runAuthAndIsolationTests() {
  console.log('========================================================================');
  console.log(' CareCircle AI: Firebase Auth, Patient Isolation & Security Audit Tests ');
  console.log('========================================================================\n');

  await connectMongoDB();
  if (!isMongoConnected()) {
    console.error('MongoDB must be connected for persistent security tests.');
    process.exit(1);
  }

  let passed = 0;
  let total = 0;

  const test = async (title, fn) => {
    total++;
    try {
      await fn();
      console.log(`[PASS ${passed + 1}/${total}] ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL ${total}] ${title}: ${err.message}`);
    }
  };

  const user1Uid = `usr_test_1_${Date.now()}`;
  const user1Email = `user1_${Date.now()}@carecircle.health`;
  const user1Token = generateTestToken(user1Uid, user1Email, 3600);

  const user2Uid = `usr_test_2_${Date.now()}`;
  const user2Email = `user2_${Date.now()}@carecircle.health`;
  const user2Token = generateTestToken(user2Uid, user2Email, 3600);

  const testPatientId = `pat_${Date.now().toString().slice(-6)}`;

  // Test 1: User Registration in MongoDB
  await test('1. User Registration: Persist user profile in MongoDB', async () => {
    const userDoc = await User.create({
      firebaseUid: user1Uid,
      email: user1Email,
      displayName: 'Alice Johnson',
      role: 'patient',
    });
    assert(userDoc._id, 'User record must have _id');
    assert.strictEqual(userDoc.firebaseUid, user1Uid);
  });

  // Test 2: User Login & Token Verification
  await test('2. User Login: Verify valid Firebase auth token structure and claims', async () => {
    const decoded = await verifyFirebaseToken(user1Token);
    assert.strictEqual(decoded.uid, user1Uid);
    assert.strictEqual(decoded.email, user1Email);
  });

  // Test 3: Invalid Token Rejection
  await test('3. Invalid Token Rejection: Malformed token must be rejected', async () => {
    let rejected = false;
    try {
      await verifyFirebaseToken('invalid.tampered.token');
    } catch (err) {
      rejected = true;
    }
    assert.strictEqual(rejected, true, 'Malformed token must throw an authentication error');
  });

  // Test 4: Expired Token Rejection
  await test('4. Expired Token Rejection: Expired token must throw expired error', async () => {
    const expiredToken = generateTestToken(user1Uid, user1Email, -600); // 10 minutes ago
    let rejected = false;
    try {
      await verifyFirebaseToken(expiredToken);
    } catch (err) {
      rejected = err.message.includes('expired');
    }
    assert.strictEqual(rejected, true, 'Expired token must be rejected');
  });

  // Test 5: Protected Endpoint Access
  await test('5. Protected Endpoint Access: Authorized request returns patient overview', async () => {
    const res = await fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.uid, user1Uid);
  });

  // Test 6: User-Specific Patient Creation & Retrieval
  await test('6. User-Specific Patient Retrieval: Create real patient owned by User 1', async () => {
    const patDoc = await Patient.create({
      patientId: testPatientId,
      userId: user1Uid, // Owned by User 1
      name: 'Alice Johnson',
      dateOfBirth: '1948-06-12',
      gender: 'Female',
      emergencyContacts: [{ name: 'Bob Johnson', phone: '+1-555-0188', relationship: 'Son' }],
    });
    assert.strictEqual(patDoc.userId, user1Uid);

    const meRes = await fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.patientProfile?.patientId, testPatientId);
  });

  // Test 7: Cross-User Patient Access Rejection
  await test('7. Cross-User Patient Access Rejection: User 2 cannot access User 1 patient', async () => {
    // User 2 attempts to request User 1's patientId via header
    const crossRes = await fetch('http://localhost:5000/api/patient/overview', {
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'x-patient-id': testPatientId,
      },
    });
    assert.strictEqual(crossRes.status, 403, `Expected 403 Forbidden, got ${crossRes.status}`);
    const data = await crossRes.json();
    assert(data.error.includes('Access Denied'), 'Must contain Access Denied error message');
  });

  // Test 8: Medication CRUD Persistence
  await test('8. Medication CRUD Persistence: Save and query real medication in MongoDB', async () => {
    const med = await Medication.create({
      patientId: testPatientId,
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily in morning',
      stockRemaining: 30,
      refillThreshold: 5,
      status: 'active',
      isVerified: true,
    });
    assert(med._id, 'Medication must persist with MongoDB _id');

    // Query through API
    const medRes = await fetch('http://localhost:5000/api/medications', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-patient-id': testPatientId,
      },
    });
    const medData = await medRes.json();
    assert(medData.medications.some((m) => m.name === 'Lisinopril'));
  });

  // Test 9: Prescription Persistence
  await test('9. Prescription Persistence: Verified prescription saved under patientId', async () => {
    const rx = await Prescription.create({
      prescriptionId: `RX-SEC-${Date.now().toString().slice(-4)}`,
      patientId: testPatientId,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample_sec.jpg',
      cloudinaryPublicId: 'sec_rx_01',
      doctorName: 'Dr. Evelyn Clark',
      status: 'verified',
      extractedMedications: [{ name: 'Lisinopril', dosage: '10mg' }],
    });
    assert(rx._id, 'Prescription must persist in MongoDB');

    const rxRes = await fetch('http://localhost:5000/api/prescriptions', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-patient-id': testPatientId,
      },
    });
    const rxData = await rxRes.json();
    assert(rxData.prescriptions.length > 0, 'Prescriptions list must reflect real saved record');
  });

  // Test 10: Caregiver Authorization Workflow
  await test('10. Caregiver Authorization: User 1 authorizes User 2 as caregiver', async () => {
    // User 1 invites User 2
    const inviteRes = await fetch('http://localhost:5000/api/auth/invite-caregiver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
        'x-patient-id': testPatientId,
      },
      body: JSON.stringify({
        caregiverEmail: user2Email,
        caregiverName: 'Caregiver Bob',
        relationship: 'Son & Caregiver',
        permissions: ['read_medications', 'log_dose'],
      }),
    });
    assert.strictEqual(inviteRes.status, 200);

    // User 2 now attempts to access User 1's patient overview
    const cgRes = await fetch('http://localhost:5000/api/patient/overview', {
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'x-patient-id': testPatientId,
      },
    });
    assert.strictEqual(cgRes.status, 200, `Authorized caregiver should receive 200 OK, got ${cgRes.status}`);
    const cgData = await cgRes.json();
    assert.strictEqual(cgData.data.patient.name, 'Alice Johnson');
  });

  // Test 11: AI Agent Access to Only Authorized Patient Data
  await test('11. AI Agent Isolation: Tool execution enforces caller activePatientId', async () => {
    // Call agent with User 1's patient context
    const resp = await defaultOrchestrator.processMessage({
      messages: [{ role: 'user', content: 'What medications should I take today?' }],
      context: {
        patientId: testPatientId,
        user: { uid: user1Uid, name: 'Alice Johnson' },
        confirmedActions: [],
      },
    });
    assert(resp.toolCalls.length > 0);
    const medResult = resp.toolCalls[0].result;
    assert.strictEqual(medResult.patientId, testPatientId);
    assert(medResult.medications.some((m) => m.name === 'Lisinopril'));
  });

  // Test 12: Revocation & Cleanup
  await test('12. Revocation & Protected Route Behavior: Revoking caregiver removes access', async () => {
    await Caregiver.deleteOne({ patientId: testPatientId, caregiverEmail: user2Email.toLowerCase() });

    // User 2 tries to access again
    const revokedRes = await fetch('http://localhost:5000/api/patient/overview', {
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'x-patient-id': testPatientId,
      },
    });
    assert.strictEqual(revokedRes.status, 403, 'Revoked caregiver must be rejected with 403 Forbidden');

    // Cleanup test records
    await Patient.deleteOne({ patientId: testPatientId });
    await User.deleteOne({ firebaseUid: user1Uid });
    await Medication.deleteMany({ patientId: testPatientId });
    await Prescription.deleteMany({ patientId: testPatientId });
  });

  console.log('\n========================================================================');
  console.log(` Security & Authorization Audit: ${passed} / ${total} Tests Passed `);
  console.log('========================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runAuthAndIsolationTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
