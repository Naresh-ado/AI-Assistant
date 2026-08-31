import mongoose from 'mongoose';

const companionMessageSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  emotion: { type: String, default: 'calm' },
  animation: { type: String, default: 'idle' },
  context_summary: { type: String, default: '' },
  created_date: { type: Date, default: Date.now }
});

companionMessageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const CompanionMessage = mongoose.model('CompanionMessage', companionMessageSchema);
