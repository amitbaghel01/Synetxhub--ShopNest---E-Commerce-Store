import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, default: 'General', trim: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
