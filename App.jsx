import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('shopnest_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('shopnest_token') || '');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('shopnest_cart') || '[]'));
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState('shop');
  const [authMode, setAuthMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [shipping, setShipping] = useState({ fullName: '', address: '', city: '', postalCode: '', country: 'India' });
  const [productForm, setProductForm] = useState({ name: '', description: '', category: 'General', image: '', price: '', stock: '' });
  const [editingId, setEditingId] = useState('');

  const api = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Something went wrong.');
    return data;
  };

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'All') params.set('category', category);
      setProducts(await api(`/products?${params.toString()}`));
    } catch (e) { setNotice(e.message); }
  };

  useEffect(() => { loadProducts(); }, [search, category]);
  useEffect(() => { localStorage.setItem('shopnest_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (user) {
      localStorage.setItem('shopnest_user', JSON.stringify(user));
      if (token) localStorage.setItem('shopnest_token', token);
    } else {
      localStorage.removeItem('shopnest_user');
      localStorage.removeItem('shopnest_token');
    }
  }, [user, token]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  function addToCart(product) {
    if (product.stock < 1) return setNotice('This product is currently out of stock.');
    setCart(old => {
      const found = old.find(item => item._id === product._id);
      if (found) return old.map(item => item._id === product._id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...old, { _id: product._id, name: product.name, price: product.price, image: product.image, stock: product.stock, quantity: 1 }];
    });
    setNotice(`${product.name} added to your cart.`);
  }
  function changeQuantity(id, quantity) {
    setCart(old => old.map(item => item._id === id ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.stock)) } : item));
  }
  function logout() {
    setUser(null); setToken(''); setOrders([]); setAdminOrders([]); setPage('shop');
    setNotice('You have been logged out.');
  }

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(authForm) });
      setToken(data.token); setUser(data.user); setPage('shop'); setAuthForm({ name: '', email: '', password: '' });
      setNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ''}!`);
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  async function checkout(e) {
    e.preventDefault();
    if (!user) { setNotice('Please log in before checkout.'); setPage('account'); return; }
    setBusy(true);
    try {
      const order = await api('/orders', { method: 'POST', body: JSON.stringify({
        items: cart.map(item => ({ product: item._id, quantity: item.quantity })), shippingAddress: shipping
      }) });
      setCart([]); setNotice(`Order placed successfully! Order ID: ${order._id.slice(-8)}. Payment is pending (demo checkout).`);
      await loadProducts(); await loadMyOrders(); setPage('orders');
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  async function loadMyOrders() {
    try { setOrders(await api('/orders/my')); } catch (e) { setNotice(e.message); }
  }
  async function openOrders() { setPage('orders'); await loadMyOrders(); }
  async function openAdmin() {
    setPage('admin');
    try { setAdminOrders(await api('/orders')); } catch (e) { setNotice(e.message); }
  }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
      await api(editingId ? `/products/${editingId}` : '/products', {
        method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload)
      });
      setProductForm({ name: '', description: '', category: 'General', image: '', price: '', stock: '' });
      setEditingId(''); setNotice(editingId ? 'Product updated.' : 'Product created.');
      await loadProducts();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  function editProduct(p) {
    setEditingId(p._id);
    setProductForm({ name: p.name, description: p.description || '', category: p.category || 'General', image: p.image || '', price: String(p.price), stock: String(p.stock) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function deleteProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    try { await api(`/products/${id}`, { method: 'DELETE' }); setNotice('Product deleted.'); await loadProducts(); }
    catch (e) { setNotice(e.message); }
  }
  async function changeOrderStatus(id, status) {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setAdminOrders(await api('/orders')); setNotice('Order status updated.');
    } catch (e) { setNotice(e.message); }
  }

  const featured = useMemo(() => products.filter(p => p.featured).slice(0, 3), [products]);

  return <div className="app-shell">
    <div className="topline">Thoughtful finds for everyday life · Free shipping on orders over ₹2,000</div>
    <header className="navbar">
      <button className="brand" onClick={() => setPage('shop')} aria-label="ShopNest home"><span className="brand-mark">S</span><span>shopnest<small>EVERYDAY FINDS</small></span></button>
      <nav>
        <button className={page === 'shop' ? 'nav-active' : ''} onClick={() => setPage('shop')}>Shop</button>
        {user && <button className={page === 'orders' ? 'nav-active' : ''} onClick={openOrders}>My orders</button>}
        {user?.role === 'admin' && <button className={page === 'admin' ? 'nav-active' : ''} onClick={openAdmin}>Admin</button>}
      </nav>
      <div className="nav-actions">
        {user ? <><span className="welcome">Hi, {user.name.split(' ')[0]}</span><button className="text-btn" onClick={logout}>Log out</button></> : <button className="text-btn" onClick={() => { setPage('account'); setAuthMode('login'); }}>Sign in</button>}
        <button className="cart-button" onClick={() => setPage('cart')}>Bag <span>{cartCount}</span></button>
      </div>
    </header>

    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}

    {page === 'shop' && <>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">THE EVERYDAY EDIT</p><h1>Good things.<br/><em>Better living.</em></h1><p>Discover useful, beautifully considered essentials for the way you live, work and unwind.</p><button className="primary-btn" onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}>Explore the collection <span>↗</span></button><div className="hero-note"><span>✳</span> Curated for your everyday</div></div>
        <div className="hero-art"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-card"><span>THE DAILY<br/>ESSENTIALS</span><div className="art-sun"></div><div className="art-vase"></div><div className="art-leaf">〰</div><small>Less, but better.</small></div><div className="floating-label">Small joys<br/>live here.</div></div>
      </section>
      <section className="benefits"><div><b>✳</b><span><strong>Thoughtfully picked</strong><small>Everyday favourites</small></span></div><div><b>↗</b><span><strong>Easy & secure</strong><small>Simple checkout</small></span></div><div><b>♡</b><span><strong>Made to delight</strong><small>Little things, big joy</small></span></div></section>
      {featured.length > 0 && <section className="featured-section"><div className="section-heading"><div><p className="eyebrow">HANDPICKED FOR YOU</p><h2>Customer favourites</h2></div><button className="underlined" onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}>Shop all ↗</button></div><div className="product-grid">{featured.map(p => <ProductCard key={p._id} product={p} onAdd={addToCart}/>)}</div></section>}
      <section id="catalogue" className="catalogue"><div className="section-heading"><div><p className="eyebrow">FIND YOUR NEXT FAVOURITE</p><h2>Shop the collection</h2></div><span className="product-count">{products.length} items</span></div>
        <div className="filters"><input aria-label="Search products" placeholder="Search the collection..." value={search} onChange={e => setSearch(e.target.value)}/><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
        {products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p._id} product={p} onAdd={addToCart}/>)}</div> : <div className="empty-state"><span>⌕</span><h3>No products found</h3><p>Try another search or category.</p></div>}
      </section>
      <section className="newsletter"><p className="eyebrow">A LITTLE NOTE FROM US</p><h2>Good finds, straight to you.</h2><p>Simple essentials. Fresh inspiration. No clutter.</p><button className="light-btn" onClick={() => setNotice('Thanks for your interest! Newsletter signup can be connected to an email service.')}>Stay in the loop ↗</button></section>
    </>}

    {page === 'account' && <main className="page-container account-layout"><div className="account-aside"><p className="eyebrow">WELCOME TO SHOPNEST</p><h1>A little more<br/><em>you, every day.</em></h1><p>Sign in to keep track of your orders and make checkout a breeze.</p></div><form className="panel auth-panel" onSubmit={submitAuth}><p className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</p><h2>{authMode === 'login' ? 'Sign in' : 'Join ShopNest'}</h2>{authMode === 'register' && <label>Full name<input required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} autoComplete="name"/></label>}<label>Email address<input type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} autoComplete="email"/></label><label>Password<input type="password" minLength="8" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}/></label><button className="primary-btn full-width" disabled={busy}>{busy ? 'Please wait...' : authMode === 'login' ? 'Sign in →' : 'Create account →'}</button><p className="switch-auth">{authMode === 'login' ? 'New around here?' : 'Already have an account?'} <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p></form></main>}

    {page === 'cart' && <main className="page-container"><p className="eyebrow">YOUR PICKS</p><h1 className="page-title">Your shopping bag</h1>{!cart.length ? <div className="empty-state"><span>♡</span><h3>Your bag is taking a breather.</h3><p>Find something lovely for your everyday.</p><button className="primary-btn" onClick={() => setPage('shop')}>Continue shopping ↗</button></div> : <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={item._id}><img src={item.image || 'https://placehold.co/180x180?text=ShopNest'} alt={item.name}/><div className="cart-item-info"><h3>{item.name}</h3><p>{money(item.price)}</p><div className="quantity"><button onClick={() => changeQuantity(item._id, item.quantity - 1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item._id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Increase quantity">+</button></div></div><strong>{money(item.price * item.quantity)}</strong><button className="remove-btn" onClick={() => setCart(cart.filter(p => p._id !== item._id))}>Remove</button></div>)}</div><div className="panel summary"><h2>Order summary</h2><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><div><span>Shipping</span><strong>{cartTotal >= 2000 ? 'Free' : money(99)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(cartTotal + (cartTotal >= 2000 ? 0 : 99))}</strong></div><p className="muted">Demo checkout only. No real payment is taken.</p><button className="primary-btn full-width" onClick={() => setPage('checkout')}>Continue to checkout →</button></div></div>}</main>}

    {page === 'checkout' && <main className="page-container checkout-page"><p className="eyebrow">ALMOST YOURS</p><h1 className="page-title">Checkout</h1><div className="cart-layout"><form className="panel checkout-form" onSubmit={checkout}><h2>Shipping details</h2><p className="muted">All fields are required to place your order.</p>{[['fullName','Full name'],['address','Street address'],['city','City'],['postalCode','Postal code'],['country','Country']].map(([key,label]) => <label key={key}>{label}<input required value={shipping[key]} onChange={e => setShipping({ ...shipping, [key]: e.target.value })}/></label>)}{!user && <p className="muted">You'll be asked to sign in before the order is placed.</p>}<button className="primary-btn full-width" disabled={busy || !cart.length}>{busy ? 'Placing order...' : `Place order · ${money(cartTotal + (cartTotal >= 2000 ? 0 : 99))}`}</button></form><div className="panel summary"><h2>Your order</h2>{cart.map(item => <div key={item._id}><span>{item.name} × {item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="summary-total"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><p className="muted">Payment is pending in this demonstration store.</p></div></div></main>}

    {page === 'orders' && <main className="page-container"><p className="eyebrow">YOUR SHOPNEST HISTORY</p><h1 className="page-title">My orders</h1>{orders.length ? <div className="orders-list">{orders.map(order => <div className="panel order-card" key={order._id}><div className="order-top"><div><small>ORDER #{order._id.slice(-8).toUpperCase()}</small><h3>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3></div><span className={`status status-${order.status}`}>{order.status}</span></div>{order.items.map((item, i) => <p key={i}>{item.name} × {item.quantity} <strong>{money(item.price * item.quantity)}</strong></p>)}<div className="order-bottom"><span>Payment: {order.paymentStatus}</span><strong>Total {money(order.total)}</strong></div></div>)}</div> : <div className="empty-state"><span>↗</span><h3>No orders yet</h3><p>Your next great find is waiting.</p><button className="primary-btn" onClick={() => setPage('shop')}>Explore the shop</button></div>}</main>}

    {page === 'admin' && user?.role === 'admin' && <main className="page-container admin-page"><p className="eyebrow">STORE CONTROL</p><h1 className="page-title">Admin dashboard</h1><div className="admin-stats"><div className="panel"><small>Products</small><strong>{products.length}</strong></div><div className="panel"><small>Orders</small><strong>{adminOrders.length}</strong></div><div className="panel"><small>Order value</small><strong>{money(adminOrders.reduce((s, o) => s + o.total, 0))}</strong></div></div><div className="admin-grid"><form className="panel product-editor" onSubmit={saveProduct}><p className="eyebrow">{editingId ? 'EDIT ITEM' : 'ADD SOMETHING NEW'}</p><h2>{editingId ? 'Update product' : 'Create product'}</h2><label>Product name<input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })}/></label><label>Description<textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })}/></label><label>Category<input required value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}/></label><label>Image URL<input type="url" value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })}/></label><div className="two-fields"><label>Price (₹)<input type="number" min="0" step="1" required value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })}/></label><label>Stock<input type="number" min="0" step="1" required value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })}/></label></div><div className="editor-actions"><button className="primary-btn" disabled={busy}>{editingId ? 'Save changes' : 'Add product'} →</button>{editingId && <button type="button" className="text-btn" onClick={() => { setEditingId(''); setProductForm({ name: '', description: '', category: 'General', image: '', price: '', stock: '' }); }}>Cancel</button>}</div></form><div className="panel admin-products"><h2>Manage products</h2>{products.map(p => <div className="manage-row" key={p._id}><img src={p.image || 'https://placehold.co/100x100?text=Item'} alt=""/><div><strong>{p.name}</strong><small>{money(p.price)} · Stock {p.stock}</small></div><button className="text-btn" onClick={() => editProduct(p)}>Edit</button><button className="remove-btn" onClick={() => deleteProduct(p._id)}>Delete</button></div>)}</div></div><section className="panel admin-order-panel"><h2>Recent orders</h2>{adminOrders.length ? adminOrders.map(order => <div className="manage-row order-manage" key={order._id}><div><strong>#{order._id.slice(-8).toUpperCase()} · {order.user?.name || 'Customer'}</strong><small>{order.user?.email} · {money(order.total)}</small></div><select aria-label="Order status" value={order.status} onChange={e => changeOrderStatus(order._id, e.target.value)}>{['placed','processing','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>) : <p className="muted">Orders will appear here after checkout.</p>}</section></main>}

    <footer className="footer"><div className="footer-main"><div className="footer-brand"><span className="brand-mark">S</span><span>shopnest<small>EVERYDAY FINDS</small></span><p>Little things that make every day feel a bit more special.</p></div><div><strong>Explore</strong><button onClick={() => setPage('shop')}>Shop all</button><button onClick={() => setPage('cart')}>Shopping bag</button></div><div><strong>Your account</strong><button onClick={() => user ? openOrders() : setPage('account')}>{user ? 'My orders' : 'Sign in'}</button><button onClick={() => setNotice('Contact: hello@shopnest.example (demo address)')}>Contact</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ShopNest. Student project demo.</span><span>Made for everyday living ✳</span></div></footer>
  </div>;
}

function ProductCard({ product, onAdd }) {
  return <article className="product-card"><div className="product-image-wrap"><img src={product.image || 'https://placehold.co/600x600?text=ShopNest'} alt={product.name} loading="lazy"/>{product.featured && <span className="product-badge">FAVOURITE</span>}<button className="quick-add" onClick={() => onAdd(product)} disabled={product.stock < 1}>{product.stock < 1 ? 'Sold out' : '+ Add to bag'}</button></div><div className="product-meta"><span>{product.category}</span><span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div><div className="product-title-price"><h3>{product.name}</h3><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(product.price)}</strong></div><p>{product.description}</p></article>;
}

export default App;
