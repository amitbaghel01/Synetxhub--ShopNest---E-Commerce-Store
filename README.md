# ShopNest — E-Commerce Store (Project 1)

A full-stack e-commerce starter built with **React + Vite**, **Node.js + Express**, and **MongoDB + Mongoose**. It includes JWT authentication, product listings, cart, checkout/order creation, an admin dashboard, and deployment notes.

## Features
- Register and log in with JWT authentication
- Product catalogue with search and category filter
- Add/remove items and adjust quantities in a cart
- Checkout creates an order (demo checkout; no real payment is charged)
- User order history
- Admin-only product create/update/delete and order status management
- Password hashing with bcrypt, role-based authorization, request validation basics
- Responsive layout

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas connection string

## 1. Run the backend
```bash
cd server
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET in .env
npm install
npm run seed
npm run dev
```
Backend runs at `http://localhost:5000`.

Seed creates sample products and an admin:
- Email: `admin@example.com`
- Password: `Admin123!`

Change the seeded password and JWT secret before using this beyond local testing.

## 2. Run the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

## Demo checkout
Checkout creates an order with payment status `pending`; it does **not** process real payments. For production, integrate a payment provider on the server and verify payment webhooks.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PATCH /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/orders` (authenticated)
- `GET /api/orders/my` (authenticated)
- `GET /api/orders` (admin)
- `PATCH /api/orders/:id/status` (admin)

## Deploy
- **MongoDB:** create a database on MongoDB Atlas and use its connection string as `MONGODB_URI`.
- **Backend:** deploy `server` to Render, Railway, or another Node host; set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production`.
- **Frontend:** deploy `client` to Vercel or Netlify; set `VITE_API_URL` to the deployed backend URL plus `/api`.
- Add the frontend domain to the backend CORS configuration.
- Never commit `.env`, production secrets, or real customer data.
