import mongoose from 'mongoose';

const planSessionSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  plan_id: { type: String, required: true },
  course_id: { type: String, default: '' },
  topic_id: { type: String, default: '' },
  topic_title: { type: String, default: '' },
  task_id: { type: String, default: '' },
  day: { type: mongoose.Schema.Types.Mixed, default: 1 },
  date: { type: String, default: '' },
  title: { type: String, default: '' },
  session_type: { type: String, default: 'study' },
  start_offset_minutes: { type: Number, default: 0 },
  duration_minutes: { type: Number, default: 45 },
  predicted_minutes: { type: Number, default: 45 },
  planned_minutes: { type: Number, default: 45 },
  actual_minutes: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  completed_at: { type: Date, default: null },
  notes: { type: String, default: '' },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

planSessionSchema.pre('save', function(next) {
  if (!this.title && this.topic_title) this.title = this.topic_title;
  if (!this.topic_title && this.title) this.topic_title = this.title;
  next();
});

planSessionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const PlanSession = mongoose.model('PlanSession', planSessionSchema);
