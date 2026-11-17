import '../config/env.js';
import assert from 'assert';
import { connectMongoDB, isMongoConnected } from '../config/mongodb.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { verifyFirebaseToken } from '../config/firebase.js';

function createMockToken(uid, email, expSec = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: uid,
      user_id: uid,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expSec,
    })
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

async function runScenarioTests() {
  console.log('================================================================');
  console.log(' CareCircle AI: Authentication & Navigation Scenarios Test Suite');
  console.log('================================================================\n');

  await connectMongoDB();
  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`[PASS ${passed + 1}/${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  };

  const API = 'http://localhost:5000/api';
  const testUid = `test_flow_${Date.now()}`;
  const testEmail = `${testUid}@example.com`;
  const token = createMockToken(testUid, testEmail);

  // Scenario 1: Unauthenticated request to protected endpoint returns 401
  await test('Scenario 8: Unauthenticated access to /api/auth/me is rejected (401)', async () => {
    const res = await fetch(`${API}/auth/me`);
    assert.strictEqual(res.status, 401, 'Should return 401 when unauthenticated');
  });

  // Scenario 2: Authenticated user without patient profile receives hasPatientProfile=false (triggers onboarding)
  await test('Scenario 1 & 9: New user login returns hasPatientProfile=false (prompts onboarding)', async () => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testEmail);
    assert.strictEqual(data.hasPatientProfile, false, 'New user should not have a patient profile yet');
    assert.strictEqual(data.patientProfile, null);
  });

  // Scenario 3: User completes onboarding by creating patient profile
  let createdPatientId = null;
  await test('Scenario 1 (cont): Onboarding patient profile creation', async () => {
    const res = await fetch(`${API}/auth/patient-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Flow Patient',
        dateOfBirth: '1952-04-12',
        gender: 'Female',
        allergies: ['Penicillin'],
        chronicConditions: ['Hypertension'],
      }),
    });
    assert(res.status === 200 || res.status === 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.patient.patientId);
    createdPatientId = data.patient.patientId;
  });

  // Scenario 4: User now has existing patient profile (navigates directly to dashboard)
  await test('Scenario 2 & 10: Existing user login returns active patient profile (dashboard view)', async () => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.hasPatientProfile, true);
    assert.strictEqual(data.patientProfile.name, 'Test Flow Patient');
  });

  // Scenario 5: Token expiration rejection (forces re-login)
  await test('Scenario 5: Expired token rejected by backend', async () => {
    const expiredToken = createMockToken('exp_uid', 'exp@test.com', -60);
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.strictEqual(res.status, 401, 'Expired token must return 401');
  });

  // Scenario 6: Malformed token rejected
  await test('Scenario 3 & 4: Malformed/invalid token rejected', async () => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: 'Bearer totally-invalid-token' },
    });
    assert.strictEqual(res.status, 401);
  });

  // Cleanup
  if (isMongoConnected() && createdPatientId) {
    await Patient.deleteOne({ patientId: createdPatientId });
    await User.deleteOne({ firebaseUid: testUid });
  }

  console.log('\n================================================================');
  console.log(` Scenario Verification Complete: ${passed} / ${total} Tests Passed `);
  console.log('================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runScenarioTests().catch((err) => {
  console.error('Fatal scenario test failure:', err);
  process.exit(1);
});
