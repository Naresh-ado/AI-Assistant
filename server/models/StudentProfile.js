import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  display_name: { type: String, default: '' },
  age_range: { type: String, default: '18_20' },
  academic_level: { type: String, default: 'undergraduate' },
  field_of_study: { type: String, default: '' },
  institution_name: { type: String, default: '' },
  target_gpa: { type: String, default: '3.8' },
  current_gpa: { type: String, default: '3.5' },
  daily_study_capacity_hours: { type: Number, default: 4 },
  daily_available_hours: { type: Number, default: 4 },
  preferred_study_time: { type: String, default: 'evening' },
  max_focus_session_minutes: { type: Number, default: 45 },
  focus_duration_minutes: { type: Number, default: 45 },
  burnout_risk_level: { type: String, default: 'low' },
  motivation_style: { type: String, default: 'encouraging' },
  learning_style: { type: String, default: 'practice' },
  weekly_off_days: { type: [String], default: [] },
  companion_avatar: { type: String, default: 'owl' },
  companion_name: { type: String, default: 'Aether' },
  companion: { type: String, default: 'mira' },
  companion_tone: { type: String, default: 'empathetic' },
  onboarding_complete: { type: Boolean, default: false },
  calibration_complete: { type: Boolean, default: false },
  estimate_accuracy: { type: Number, default: 0.5 },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

studentProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
