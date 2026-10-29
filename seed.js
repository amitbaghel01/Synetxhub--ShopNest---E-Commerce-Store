import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopnest');
const adminEmail = 'admin@example.com';
let admin = await User.findOne({ email: adminEmail });
if (!admin) {
  admin = await User.create({
    name: 'ShopNest Admin', email: adminEmail,
    password: await bcrypt.hash('Admin123!', 12), role: 'admin'
  });
  console.log('Created admin account:', adminEmail);
} else {
  console.log('Admin account already exists:', adminEmail);
}
const count = await Product.countDocuments();
if (count === 0) {
  await Product.insertMany([
    { name: 'Everyday Backpack', description: 'A versatile backpack for work, college and travel.', category: 'Accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', price: 1499, stock: 20, featured: true },
    { name: 'Wireless Headphones', description: 'Comfortable over-ear headphones for everyday listening.', category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', price: 2299, stock: 15, featured: true },
    { name: 'Minimal Watch', description: 'A clean, minimal design that suits every occasion.', category: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', price: 1899, stock: 12 },
    { name: 'Ceramic Coffee Mug', description: 'A durable ceramic mug for your daily coffee or tea.', category: 'Home', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', price: 399, stock: 30 },
    { name: 'Classic Sneakers', description: 'Everyday sneakers with a timeless silhouette.', category: 'Fashion', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', price: 2799, stock: 10 },
    { name: 'Desk Lamp', description: 'A warm, focused light for study and work spaces.', category: 'Home', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', price: 999, stock: 18 }
  ]);
  console.log('Seeded sample products.');
}
await mongoose.disconnect();
