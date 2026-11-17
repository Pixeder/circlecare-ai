import mongoose from '../config/mongodb.js';

let UserModel = null;

if (mongoose) {
  const UserSchema = new mongoose.Schema(
    {
      firebaseUid: { type: String, required: true, unique: true, index: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      displayName: { type: String, default: '' },
      role: {
        type: String,
        enum: ['patient', 'caregiver', 'family'],
        default: 'patient',
      },
      activePatientId: { type: String, default: null },
      photoURL: { type: String, default: '' },
      lastLoginAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
  );

  UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
} else {
  UserModel = {
    findOne: async () => null,
    find: async () => [],
    create: async (d) => ({ ...d, _id: `user_${Date.now()}` }),
    findOneAndUpdate: async () => null,
  };
}

export const User = UserModel;
export default User;
