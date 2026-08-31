import mongoose from 'mongoose';

const academicTaskSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  course_id: { type: String, default: '' },
  topic_ids: { type: [String], default: [] },
  title: { type: String, required: true },
  type: { type: String, default: 'assignment' },
  due_date: { type: Date, default: Date.now },
  weight_percentage: { type: Number, default: 10 },
  estimated_hours: { type: Number, default: 3 },
  status: { type: String, default: 'pending' },
  priority: { type: String, default: 'medium' },
  notes: { type: String, default: '' },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

academicTaskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const AcademicTask = mongoose.model('AcademicTask', academicTaskSchema);
