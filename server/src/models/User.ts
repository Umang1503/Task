import mongoose from '../db';

const UserSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
