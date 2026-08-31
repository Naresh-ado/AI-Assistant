import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  course_id: { type: String, default: '' },
  course_title: { type: String, default: '' },
  title: { type: String, default: '' },
  start_topic_id: { type: String, default: '' },
  start_topic_title: { type: String, default: '' },
  end_topic_id: { type: String, default: '' },
  end_topic_title: { type: String, default: '' },
  target_date: { type: String, default: '' },
  start_date: { type: Date, default: Date.now },
  end_date: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  daily_hours: { type: Number, default: 4 },
  daily_target_hours: { type: Number, default: 4 },
  total_estimated_minutes: { type: Number, default: 0 },
  available_minutes: { type: Number, default: 0 },
  workload_level: { type: String, default: 'green' },
  strategy_mode: { type: String, default: 'balanced' },
  rescue_reason: { type: String, default: '' },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

studyPlanSchema.pre('save', function(next) {
  if (!this.title && this.course_title) this.title = this.course_title;
  if (!this.course_title && this.title) this.course_title = this.title;
  next();
});

studyPlanSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
