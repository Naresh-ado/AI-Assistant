import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  created_by_id: { type: String, required: true },
  title: { type: String, default: '' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  code: { type: String, default: '' },
  color: { type: String, default: '#4f46e5' },
  credits: { type: Number, default: 3 },
  difficulty: { type: String, default: 'medium' },
  target_grade: { type: String, default: 'A' },
  syllabus_summary: { type: String, default: '' },
  created_date: { type: Date, default: Date.now }
}, { strict: false });

courseSchema.pre('save', function(next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  next();
});

courseSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Course = mongoose.model('Course', courseSchema);
