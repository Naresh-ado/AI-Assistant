import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  course_id: { type: String, required: true },
  unit: { type: String, default: 'Unit 1' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  importance: { type: String, default: 'medium' },
  estimated_minutes: { type: Number, default: 60 },
  estimated_hours: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' },
  prerequisites: { type: [String], default: [] },
  mastery_level: { type: String, default: 'unstudied' },
  status: { type: String, default: 'pending' },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

topicSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Topic = mongoose.model('Topic', topicSchema);
