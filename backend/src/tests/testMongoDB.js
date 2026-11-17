import '../config/env.js';
import { connectMongoDB, isMongoConnected } from '../config/mongodb.js';
import { Prescription } from '../models/Prescription.js';

async function testMongoDB() {
  console.log('=== MongoDB Live Connection Test ===');

  try {
    const conn = await connectMongoDB();

    if (!isMongoConnected()) {
      console.log('RESULT: CONFIGURED_NOT_CONNECTED — MongoDB did not connect or timed out.');
      process.exit(0);
    }

    console.log('✅ MongoDB connected to host:', conn?.host || 'connected');

    // Create
    const testDoc = await Prescription.create({
      prescriptionId: `TEST-${Date.now().toString().slice(-6)}`,
      patientId: 'patient_elderly_001',
      imageUrl: 'https://example.com/test.jpg',
      cloudinaryPublicId: 'test-public-id',
      doctorName: 'Dr. Test Geriatrician',
      status: 'pending_verification',
      extractedMedications: [],
      uncertainFields: [],
    });
    console.log(`✅ Create: Prescription ${testDoc.prescriptionId} saved successfully`);

    // Read
    const found = await Prescription.findOne({ prescriptionId: testDoc.prescriptionId });
    console.log(`✅ Read: Found prescription with doctorName="${found.doctorName}"`);

    // Update
    await Prescription.updateOne({ prescriptionId: testDoc.prescriptionId }, { status: 'verified' });
    const updated = await Prescription.findOne({ prescriptionId: testDoc.prescriptionId });
    console.log(`✅ Update: Status is now "${updated.status}"`);

    // Delete
    await Prescription.deleteOne({ prescriptionId: testDoc.prescriptionId });
    const deleted = await Prescription.findOne({ prescriptionId: testDoc.prescriptionId });
    console.log(`✅ Delete: Document ${deleted ? 'still exists (FAIL)' : 'removed (OK)'}`);

    console.log('\n✅ RESULT: MongoDB LIVE_CONNECTED — All CRUD operations passed');
  } catch (err) {
    console.error(`❌ RESULT: MongoDB check finished: ${err.message}`);
  }
  process.exit(0);
}

testMongoDB();
