import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    const required = ['fullName', 'address', 'city', 'postalCode', 'country'];
    if (!Array.isArray(items) || items.length === 0 || !shippingAddress || required.some(k => !shippingAddress[k]?.trim())) {
      return res.status(400).json({ message: 'Add at least one item and complete all shipping fields.' });
    }

    // Re-read prices and stock from the database; never trust prices sent by the browser.
    const orderItems = [];
    let total = 0;
    const stockChanges = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'Invalid item quantity.' });
      const product = await Product.findById(item.product);
      if (!product) return res.status(400).json({ message: 'A product in your cart no longer exists.' });
      if (product.stock < quantity) return res.status(409).json({ message: `Not enough stock for ${product.name}.` });
      orderItems.push({ product: product._id, name: product.name, image: product.image, price: product.price, quantity });
      total += product.price * quantity;
      stockChanges.push({ product, quantity });
    }

    // Compatible with local standalone MongoDB as well as Atlas. If saving fails, best-effort stock rollback.
    try {
      for (const change of stockChanges) {
        change.product.stock -= change.quantity;
        await change.product.save();
      }
      const order = await Order.create({
        user: req.user._id, items: orderItems, shippingAddress,
        total: Math.round(total * 100) / 100, status: 'placed', paymentStatus: 'pending'
      });
      return res.status(201).json(order);
    } catch (err) {
      for (const change of stockChanges) {
        try { await Product.updateOne({ _id: change.product._id }, { $inc: { stock: change.quantity } }); } catch {}
      }
      throw err;
    }
  } catch (err) { next(err); }
});

router.get('/my', protect, async (req, res, next) => {
  try {
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});

router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    res.json(await Order.find().populate('user', 'name email').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});

router.patch('/:id/status', protect, adminOnly, async (req, res, next) => {
  try {
    const allowed = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) { next(err); }
});

export default router;
