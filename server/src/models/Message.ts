import mongoose from '../db';

const MessageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  text: { type: String },
  createdAt: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed }
});

export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export default Message;
