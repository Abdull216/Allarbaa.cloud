const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

const GA_ID = 'G-HD01MF5SL9';
const ADSENSE_ID = 'ca-pub-8506685239599445';
const SITE_NAME = 'Allarbaa Boost';
const SITE_URL = 'https://allarbaa.cloud';
const CONTACT_EMAIL = 'abdullahharuna216@gmail.com';

// ==================== EMAIL AUTOMATION ====================
async function sendEmail(to, subject, html) {
    try {
        const data = getData();
        const gmailUser = data.settings?.gmailUser;
        const gmailPass = data.settings?.gmailPass;
        if (!gmailUser || !gmailPass) return console.log('[EMAIL] Gmail not configured — skipping email to', to);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailUser, pass: gmailPass }
        });
        await transporter.sendMail({
            from: `Allarbaa Boost <${gmailUser}>`,
            to, subject, html
        });
        console.log('[EMAIL] ✅ Sent to', to);
    } catch(e) {
        console.error('[EMAIL] ❌ Failed:', e.message);
    }
}

function emailOrderConfirmed(order) {
    return sendEmail(order.clientEmail, `✅ Order Confirmed — ${order.orderId} | Allarbaa Boost`, `
<!DOCTYPE html><html><body style="background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;padding:30px;max-width:600px;margin:0 auto;">
<div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:32px;text-align:center;">
<div style="font-size:3rem;margin-bottom:16px;">✅</div>
<h2 style="color:#10b981;margin-bottom:8px;">Order Confirmed!</h2>
<p style="color:#64748b;">Hello <strong style="color:#fff;">${order.clientName}</strong>, your order has been received.</p>
<div style="background:#1e293b;border-radius:10px;padding:16px;margin:20px 0;">
<div style="color:#6366f1;font-size:1.4rem;font-weight:900;letter-spacing:2px;">${order.orderId}</div>
<div style="color:#64748b;font-size:12px;margin-top:4px;">Your Order ID — save this!</div>
</div>
<table style="width:100%;text-align:left;border-collapse:collapse;margin:16px 0;">
<tr><td style="color:#64748b;padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;">Package</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid #1e293b;font-weight:bold;">${order.packageName}</td></tr>
<tr><td style="color:#64748b;padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;">Visitors</td><td style="color:#10b981;padding:8px 0;border-bottom:1px solid #1e293b;font-weight:bold;">${order.visitorsTarget.toLocaleString()}</td></tr>
<tr><td style="color:#64748b;padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;">Duration</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid #1e293b;">${order.duration} days</td></tr>
<tr><td style="color:#64748b;padding:8px 0;font-size:13px;">Amount Paid</td><td style="color:#f59e0b;padding:8px 0;font-weight:bold;">$${order.price}</td></tr>
</table>
<p style="color:#64748b;font-size:13px;">We will review your payment and activate your campaign within <strong style="color:#10b981;">24 hours</strong>.</p>
<a href="https://allarbaa.cloud/track-order?id=${order.orderId}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">📊 Track Your Order</a>
<p style="color:#334155;font-size:12px;margin-top:20px;">Questions? Reply to this email or contact us at abdullahharuna216@gmail.com</p>
</div></body></html>`);
}

function emailCampaignStarted(order) {
    return sendEmail(order.clientEmail, `🚀 Your Campaign is LIVE! — ${order.orderId} | Allarbaa Boost`, `
<!DOCTYPE html><html><body style="background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;padding:30px;max-width:600px;margin:0 auto;">
<div style="background:#0f172a;border:1px solid #10b981;border-radius:16px;padding:32px;text-align:center;">
<div style="font-size:3rem;margin-bottom:16px;">🚀</div>
<h2 style="color:#10b981;margin-bottom:8px;">Your Campaign is LIVE!</h2>
<p style="color:#64748b;">Hello <strong style="color:#fff;">${order.clientName}</strong>, great news! Your traffic campaign has been activated.</p>
<div style="background:#1e293b;border-radius:10px;padding:16px;margin:20px 0;">
<div style="color:#f59e0b;font-size:1.1rem;font-weight:900;">${order.visitorsTarget.toLocaleString()} Real Visitors</div>
<div style="color:#64748b;font-size:12px;margin-top:4px;">are now being sent to your website</div>
<div style="color:#10b981;font-weight:bold;margin-top:8px;font-size:0.9rem;">🎯 ${order.targetUrl}</div>
</div>
<p style="color:#64748b;font-size:13px;">Your campaign runs for <strong style="color:#fff;">${order.duration} days</strong>. You can track your progress anytime using your Order ID.</p>
<a href="https://allarbaa.cloud/track-order?id=${order.orderId}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">📊 Track Live Progress</a>
<p style="color:#334155;font-size:12px;margin-top:20px;">Allarbaa Boost — Real Traffic. Real Growth. Real Results.</p>
</div></body></html>`);
}

function emailCampaignCompleted(order) {
    return sendEmail(order.clientEmail, `🏁 Campaign Complete! — ${order.orderId} | Allarbaa Boost`, `
<!DOCTYPE html><html><body style="background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;padding:30px;max-width:600px;margin:0 auto;">
<div style="background:#0f172a;border:1px solid #8b5cf6;border-radius:16px;padding:32px;text-align:center;">
<div style="font-size:3rem;margin-bottom:16px;">🏁</div>
<h2 style="color:#8b5cf6;margin-bottom:8px;">Campaign Completed!</h2>
<p style="color:#64748b;">Hello <strong style="color:#fff;">${order.clientName}</strong>, your traffic campaign has been fully delivered!</p>
<div style="background:#1e293b;border-radius:10px;padding:20px;margin:20px 0;">
<div style="font-size:2rem;font-weight:900;color:#10b981;">${order.visitorsTarget.toLocaleString()}</div>
<div style="color:#64748b;font-size:13px;">Real visitors delivered to</div>
<div style="color:#10b981;font-weight:bold;margin-top:6px;">${order.targetUrl}</div>
</div>
<p style="color:#64748b;font-size:13px;">Thank you for choosing Allarbaa Boost! Ready to grow even more? Order another campaign and keep the momentum going.</p>
<a href="https://allarbaa.cloud/#packages" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">🚀 Order Again</a>
<p style="color:#334155;font-size:12px;margin-top:20px;">Allarbaa Boost — Real Traffic. Real Growth. Real Results.</p>
</div></body></html>`);
}

// ==================== STORAGE ====================
const DISK_PATH = fs.existsSync('/data') ? '/data' : __dirname;
const DATA_FILE = path.join(DISK_PATH, 'data.json');
const UPLOADS_DIR = path.join(DISK_PATH, 'uploads');
const RECEIPTS_DIR = path.join(DISK_PATH, 'receipts');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(RECEIPTS_DIR);

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'allarbaa_boost_ceo_2026_ultra_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECEIPTS_DIR),
    filename: (req, file, cb) => cb(null, 'receipt-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== DATABASE ====================
function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (!d.orders) d.orders = [];
            if (!d.clients) d.clients = [];
            if (!d.testimonials) d.testimonials = getDefaultTestimonials();
            if (!d.stats) d.stats = { totalOrders: 847, totalVisitors: 2847000, happyClients: 312 };
            if (!d.payment) d.payment = getDefaultPayment();
            if (!d.campaigns) d.campaigns = [];
            if (!d.packages) d.packages = getDefaultPackages();
            return d;
        }
    } catch(e) {}
    const def = getDefaultData();
    saveData(def);
    return def;
}

function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function getDefaultPackages() {
    return [
        { id: 1, name: 'Starter', emoji: '🥉', visitors: 1000, duration: 7, price: 5, priceUSD: 5, color: '#10b981', popular: false, features: ['1,000 Real Visitors', '7 Days Campaign', 'Basic Analytics', 'Email Support', 'Social Traffic'] },
        { id: 2, name: 'Growth', emoji: '🥈', visitors: 5000, duration: 14, price: 15, priceUSD: 15, color: '#3b82f6', popular: false, features: ['5,000 Real Visitors', '14 Days Campaign', 'Detailed Analytics', 'Priority Support', 'Social + Search Traffic'] },
        { id: 3, name: 'Business', emoji: '🥇', visitors: 15000, duration: 30, price: 40, priceUSD: 40, color: '#f59e0b', popular: true, features: ['15,000 Real Visitors', '30 Days Campaign', 'Full Analytics Dashboard', 'Priority Support', 'Multi-Source Traffic', 'SEO Blog Boost'] },
        { id: 4, name: 'Premium', emoji: '💎', visitors: 50000, duration: 30, price: 90, priceUSD: 90, color: '#8b5cf6', popular: false, features: ['50,000 Real Visitors', '30 Days Campaign', 'Real-Time Analytics', '24/7 Support', 'All Traffic Sources', 'SEO Boost + Backlinks', 'Monthly Report'] },
        { id: 5, name: 'Enterprise', emoji: '🚀', visitors: 200000, duration: 60, price: 250, priceUSD: 250, color: '#ef4444', popular: false, features: ['200,000 Real Visitors', '60 Days Campaign', 'Advanced Analytics', 'Dedicated Manager', 'All Premium Sources', 'Full SEO Package', 'Weekly Reports', 'Brand Mentions'] }
    ];
}

function getDefaultPayment() {
    return {
        bankName: '',
        bankAccount: '',
        bankHolder: '',
        paystackKey: '',
        paystackId: '',
        bitcoinAddress: '',
        usdtAddress: '',
        usdtNetwork: 'TRC20',
        paypalEmail: '',
        enabled: { bank: true, paystack: false, bitcoin: false, usdt: false, paypal: false }
    };
}

function getDefaultTestimonials() {
    return [
        { id: 1, name: 'Samuel O.', country: '🇳🇬 Nigeria', role: 'E-commerce Owner', text: 'My Jumia store went from 200 visitors/day to over 3,000 within 2 weeks. Sales tripled! Allarbaa Boost is the real deal.', stars: 5, package: 'Business' },
        { id: 2, name: 'Amira K.', country: '🇰🇪 Kenya', role: 'App Developer', text: 'My fintech app downloads jumped from 50 to 800+ per day. The traffic was real and engaged. Worth every penny!', stars: 5, package: 'Premium' },
        { id: 3, name: 'David M.', country: '🇬🇭 Ghana', role: 'Blog Owner', text: 'My blog went from 0 to ranking on Google page 1 after the SEO boost campaign. Incredible results in 30 days.', stars: 5, package: 'Growth' },
        { id: 4, name: 'Fatima A.', country: '🇸🇦 Saudi Arabia', role: 'Online Shop', text: 'I run an online boutique. After the Premium package, my Instagram followers grew and sales increased 4x. Highly recommend!', stars: 5, package: 'Premium' },
        { id: 5, name: 'Ibrahim T.', country: '🇳🇬 Nigeria', role: 'YouTuber', text: 'My YouTube channel views grew massively after using the Starter pack for testing. Now I am on Business plan every month.', stars: 5, package: 'Starter → Business' }
    ];
}

function getDefaultData() {
    return {
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        orders: [],
        clients: [],
        campaigns: [],
        packages: getDefaultPackages(),
        payment: getDefaultPayment(),
        testimonials: getDefaultTestimonials(),
        stats: { totalOrders: 847, totalVisitors: 2847000, happyClients: 312 },
        settings: {
            siteName: 'Allarbaa Boost',
            tagline: 'Real Traffic. Real Growth. Real Results.',
            gmailUser: '',
            gmailPass: ''
        }
    };
}

function checkAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.redirect('/admin-login');
}

function checkClient(req, res, next) {
    if (req.session.clientId) return next();
    res.redirect('/login');
}

// ==================== HELPERS ====================
function generateOrderId() {
    return 'AB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2,5).toUpperCase();
}

function formatNum(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(0) + 'K';
    return n.toString();
}

function statusBadge(status) {
    const map = {
        pending: { bg: '#f59e0b', color: '#000', label: '⏳ Pending' },
        payment_review: { bg: '#3b82f6', color: '#fff', label: '🔍 In Review' },
        active: { bg: '#10b981', color: '#000', label: '✅ Active' },
        completed: { bg: '#8b5cf6', color: '#fff', label: '🏁 Completed' },
        cancelled: { bg: '#ef4444', color: '#fff', label: '❌ Cancelled' }
    };
    const s = map[status] || map.pending;
    return `<span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;">${s.label}</span>`;
}

// ==================== CLICK TRACKING ====================
app.get('/track/:orderId', (req, res) => {
    const data = getData();
    const order = data.orders.find(o => o.orderId === req.params.orderId);
    if (order) {
        order.clicksDelivered = (order.clicksDelivered || 0) + 1;
        if (order.clicksDelivered >= order.visitorsTarget && order.status === 'active') {
            order.status = 'completed';
            order.completedAt = new Date().toISOString();
        }
        saveData(data);
    }
    res.redirect(order ? order.targetUrl : '/');
});

// ==================== API: ORDER STATUS ====================
app.get('/api/order-status/:orderId', (req, res) => {
    const data = getData();
    const order = data.orders.find(o => o.orderId === req.params.orderId);
    if (!order) return res.json({ error: 'Order not found' });
    res.json({
        orderId: order.orderId,
        status: order.status,
        package: order.packageName,
        visitorsTarget: order.visitorsTarget,
        clicksDelivered: order.clicksDelivered || 0,
        progress: Math.min(100, Math.round(((order.clicksDelivered||0) / order.visitorsTarget) * 100)),
        startDate: order.startDate || null,
        endDate: order.endDate || null
    });
});

// ==================== ADMIN LOGIN ====================
app.get('/admin-login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Admin — Allarbaa Boost</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#030712;color:#fff;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.box{background:#0f172a;padding:40px;border-radius:20px;width:90%;max-width:400px;border:1px solid #1e293b;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
.logo{font-size:2rem;font-weight:900;background:linear-gradient(135deg,#6366f1,#10b981);-webkit-background-clip:text;color:transparent;margin-bottom:8px;}
h2{color:#94a3b8;font-size:1rem;margin-bottom:28px;font-weight:400;}
input{width:100%;padding:13px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:10px;margin-bottom:14px;font-size:1rem;}
button{width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;}
a{color:#6366f1;text-decoration:none;display:block;margin-top:16px;font-size:14px;}</style></head>
<body><div class="box">
<div class="logo">⚡ Allarbaa Boost</div>
<h2>CEO Admin Access</h2>
<form method="POST" action="/auth-admin">
<input name="username" placeholder="Username" required>
<input type="password" name="password" placeholder="Password" required>
<button>🔐 Login</button></form>
<a href="/">← Back to Site</a>
</div></body></html>`);
});

app.post('/auth-admin', (req, res) => {
    const d = getData();
    if (req.body.username === d.adminAuth.user && bcrypt.compareSync(req.body.password, d.adminAuth.hash)) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.send('<script>alert("Invalid credentials!"); history.back();</script>');
    }
});

app.get('/admin-logout', (req, res) => { req.session.isAdmin = false; res.redirect('/admin-login'); });

// ==================== ADMIN DASHBOARD ====================
app.get('/admin', checkAdmin, (req, res) => {
    const data = getData();
    const pending = data.orders.filter(o => o.status === 'pending' || o.status === 'payment_review').length;
    const active = data.orders.filter(o => o.status === 'active').length;
    const completed = data.orders.filter(o => o.status === 'completed').length;
    const totalRevenue = data.orders.filter(o => ['active','completed'].includes(o.status)).reduce((s,o) => s+o.price, 0);
    const pmnt = data.payment;

    res.send(`<!DOCTYPE html><html><head><title>CEO Panel — Allarbaa Boost</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;display:flex;min-height:100vh;}
.sidebar{width:240px;background:#0a0f1e;border-right:1px solid #1e293b;padding:20px;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;}
.slogo{font-size:1.3rem;font-weight:900;background:linear-gradient(135deg,#6366f1,#10b981);-webkit-background-clip:text;color:transparent;margin-bottom:4px;}
.ssub{color:#475569;font-size:11px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #1e293b;}
.sep{color:#334155;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:10px 10px 4px;margin-top:8px;}
.sidebar a{display:block;color:#64748b;padding:10px 12px;text-decoration:none;border-radius:8px;margin-bottom:3px;font-size:13px;cursor:pointer;transition:all 0.2s;border-left:3px solid transparent;}
.sidebar a:hover,.sidebar a.active{background:#1e293b;color:#fff;border-left-color:#6366f1;}
.main{flex:1;padding:28px;overflow-y:auto;}
.panel{display:none;} .panel.active{display:block;}
.panel h3{color:#10b981;margin-bottom:18px;font-size:1.1rem;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px;}
.stat{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px;text-align:center;}
.stat .n{font-size:2rem;font-weight:900;}
.stat .l{color:#475569;font-size:11px;margin-top:4px;}
input,textarea,select{width:100%;padding:10px 12px;background:#0f172a;border:1px solid #1e293b;color:#fff;border-radius:8px;margin-bottom:10px;font-family:inherit;font-size:14px;}
textarea{min-height:80px;resize:vertical;}
button,.btn{background:#6366f1;color:#fff;font-weight:bold;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:13px;}
.btn-green{background:#10b981;color:#000;}
.btn-red{background:#ef4444;color:#fff;}
.btn-gold{background:#f59e0b;color:#000;}
label{color:#64748b;font-size:12px;display:block;margin-bottom:3px;margin-top:10px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
td,th{padding:10px 12px;border-bottom:1px solid #1e293b;text-align:left;vertical-align:middle;}
th{color:#6366f1;font-size:11px;letter-spacing:0.5px;}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;display:inline-block;}
.pkg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.pkg-card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px;}
.pkg-card h4{margin-bottom:8px;}
hr{border:0;border-top:1px solid #1e293b;margin:20px 0;}
.alert{background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#fca5a5;font-size:13px;}
.success{background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#6ee7b7;font-size:13px;}
.order-card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px;margin-bottom:14px;}
.order-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px;}
.progress-bar{background:#1e293b;border-radius:10px;height:8px;margin:8px 0;}
.progress-fill{height:8px;border-radius:10px;background:linear-gradient(90deg,#6366f1,#10b981);transition:width 0.3s;}
</style></head><body>

<div class="sidebar">
<div class="slogo">⚡ Allarbaa Boost</div>
<div class="ssub">CEO Control Panel</div>
<a onclick="show('dash')" id="tab_dash" class="active">📊 Dashboard</a>
<div class="sep">Orders</div>
<a onclick="show('orders')" id="tab_orders">📋 All Orders <span class="badge" style="background:#6366f1;color:#fff;float:right;">${data.orders.length}</span></a>
<a onclick="show('pending')" id="tab_pending">⏳ Pending Review <span class="badge" style="background:#f59e0b;color:#000;float:right;">${pending}</span></a>
<a onclick="show('active')" id="tab_active">✅ Active Campaigns <span class="badge" style="background:#10b981;color:#000;float:right;">${active}</span></a>
<div class="sep">Management</div>
<a onclick="show('packages')" id="tab_packages">📦 Edit Packages</a>
<a onclick="show('payment')" id="tab_payment">💳 Payment Settings</a>
<a onclick="show('testimonials')" id="tab_testimonials">⭐ Testimonials</a>
<a onclick="show('stats')" id="tab_stats">📈 Site Stats</a>
<div class="sep">Settings</div>
<a onclick="show('ceo')" id="tab_ceo">👑 CEO Campaign</a>
<a onclick="show('gmail')" id="tab_gmail">📧 Email Settings</a>
<a onclick="show('security')" id="tab_security">🛡️ Security</a>
<hr style="border-color:#1e293b;margin:10px 0;">
<a href="/" style="color:#f59e0b;">🌐 View Site</a>
<a href="/admin-logout" style="color:#ef4444;">🚪 Logout</a>
</div>

<div class="main">

<!-- DASHBOARD -->
<div id="dash" class="panel active">
<h3>📊 Dashboard Overview</h3>
<div class="stat-grid">
<div class="stat"><div class="n" style="color:#6366f1;">${data.orders.length}</div><div class="l">Total Orders</div></div>
<div class="stat"><div class="n" style="color:#f59e0b;">${pending}</div><div class="l">Awaiting Review</div></div>
<div class="stat"><div class="n" style="color:#10b981;">${active}</div><div class="l">Active Campaigns</div></div>
<div class="stat"><div class="n" style="color:#8b5cf6;">${completed}</div><div class="l">Completed</div></div>
<div class="stat"><div class="n" style="color:#f59e0b;">$${totalRevenue}</div><div class="l">Total Revenue</div></div>
<div class="stat"><div class="n" style="color:#10b981;">${data.clients.length}</div><div class="l">Registered Clients</div></div>
</div>
${pending > 0 ? `<div class="alert">⚠️ You have <strong>${pending}</strong> order(s) waiting for payment review! Go to "Pending Review" to approve.</div>` : '<div class="success">✅ No pending orders. All caught up!</div>'}
<h4 style="color:#94a3b8;margin-bottom:12px;">📋 Recent Orders</h4>
${data.orders.slice(0,5).map(o => `<div class="order-card">
<div class="order-header">
<div><div style="color:#fff;font-weight:bold;">${o.orderId}</div><div style="color:#64748b;font-size:12px;">${o.clientName} · ${o.targetUrl}</div></div>
<div style="text-align:right;">${statusBadge(o.status)}<div style="color:#f59e0b;font-weight:bold;margin-top:4px;">$${o.price}</div></div>
</div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;">
<span>${o.packageName} — ${formatNum(o.visitorsTarget)} visitors</span>
<span>${new Date(o.createdAt).toLocaleDateString()}</span>
</div>
<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,Math.round(((o.clicksDelivered||0)/o.visitorsTarget)*100))}%"></div></div>
<div style="font-size:11px;color:#475569;">${o.clicksDelivered||0} / ${formatNum(o.visitorsTarget)} visitors delivered</div>
</div>`).join('') || '<div style="text-align:center;padding:40px;color:#334155;">No orders yet. Share your site to get clients!</div>'}
</div>

<!-- ALL ORDERS -->
<div id="orders" class="panel">
<h3>📋 All Orders</h3>
<div style="overflow-x:auto;">
<table>
<tr><th>Order ID</th><th>Client</th><th>Package</th><th>URL</th><th>Price</th><th>Status</th><th>Progress</th><th>Date</th><th>Actions</th></tr>
${data.orders.map(o => `<tr>
<td style="color:#6366f1;font-weight:bold;">${o.orderId}</td>
<td><div style="color:#fff;">${o.clientName}</div><div style="color:#64748b;font-size:11px;">${o.clientEmail}</div></td>
<td>${o.packageName}</td>
<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><a href="${o.targetUrl}" target="_blank" style="color:#10b981;text-decoration:none;">${o.targetUrl}</a></td>
<td style="color:#f59e0b;font-weight:bold;">$${o.price}</td>
<td>${statusBadge(o.status)}</td>
<td style="font-size:12px;color:#64748b;">${o.clicksDelivered||0}/${formatNum(o.visitorsTarget)}</td>
<td style="color:#475569;font-size:12px;">${new Date(o.createdAt).toLocaleDateString()}</td>
<td>
<a href="/admin/order/${o.orderId}" style="color:#6366f1;font-size:12px;text-decoration:none;">View</a>
</td>
</tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:#334155;padding:30px;">No orders yet.</td></tr>'}
</table>
</div>
</div>

<!-- PENDING REVIEW -->
<div id="pending" class="panel">
<h3>⏳ Pending Payment Review</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">These orders have uploaded payment receipts waiting for your approval. Review and activate campaigns.</p>
${data.orders.filter(o => o.status === 'payment_review' || o.status === 'pending').map(o => `
<div class="order-card">
<div class="order-header">
<div>
<div style="color:#fff;font-weight:bold;font-size:1rem;">${o.orderId}</div>
<div style="color:#64748b;font-size:12px;margin-top:2px;">${o.clientName} · ${o.clientEmail}</div>
</div>
<div>${statusBadge(o.status)}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
<div style="background:#1e293b;border-radius:8px;padding:12px;">
<div style="color:#64748b;font-size:11px;">PACKAGE</div>
<div style="color:#fff;font-weight:bold;">${o.packageName}</div>
</div>
<div style="background:#1e293b;border-radius:8px;padding:12px;">
<div style="color:#64748b;font-size:11px;">AMOUNT</div>
<div style="color:#f59e0b;font-weight:bold;">$${o.price}</div>
</div>
<div style="background:#1e293b;border-radius:8px;padding:12px;">
<div style="color:#64748b;font-size:11px;">TARGET URL</div>
<div style="color:#10b981;font-size:12px;word-break:break-all;"><a href="${o.targetUrl}" target="_blank" style="color:#10b981;">${o.targetUrl}</a></div>
</div>
<div style="background:#1e293b;border-radius:8px;padding:12px;">
<div style="color:#64748b;font-size:11px;">PAYMENT METHOD</div>
<div style="color:#fff;">${o.paymentMethod}</div>
</div>
</div>
${o.receiptFile ? `<div style="margin-bottom:14px;"><div style="color:#64748b;font-size:12px;margin-bottom:6px;">Payment Receipt:</div><a href="/receipts/${o.receiptFile}" target="_blank" style="background:#1e293b;color:#6366f1;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;display:inline-block;">📄 View Receipt</a></div>` : '<div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">No receipt uploaded yet.</div>'}
${o.paymentNote ? `<div style="background:#1e293b;border-radius:8px;padding:12px;margin-bottom:14px;color:#94a3b8;font-size:13px;"><strong style="color:#fff;">Client Note:</strong> ${o.paymentNote}</div>` : ''}
<div style="display:flex;gap:10px;flex-wrap:wrap;">
<a href="/admin/approve/${o.orderId}" onclick="return confirm('Approve and activate this campaign?')"><button class="btn-green">✅ Approve & Activate</button></a>
<a href="/admin/cancel/${o.orderId}" onclick="return confirm('Cancel this order?')"><button class="btn-red">❌ Cancel Order</button></a>
</div>
</div>`).join('') || '<div style="text-align:center;padding:60px;color:#334155;border:2px dashed #1e293b;border-radius:12px;"><p style="font-size:1.5rem;margin-bottom:8px;">🎉</p><p>No orders pending review!</p></div>'}
</div>

<!-- ACTIVE CAMPAIGNS -->
<div id="active" class="panel">
<h3>✅ Active Campaigns</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">Manage running campaigns. Update delivery progress manually or mark as completed.</p>
${data.orders.filter(o => o.status === 'active').map(o => {
    const prog = Math.min(100, Math.round(((o.clicksDelivered||0)/o.visitorsTarget)*100));
    return `<div class="order-card">
<div class="order-header">
<div>
<div style="color:#fff;font-weight:bold;">${o.orderId} — ${o.clientName}</div>
<div style="color:#64748b;font-size:12px;margin-top:2px;"><a href="${o.targetUrl}" target="_blank" style="color:#10b981;">${o.targetUrl}</a></div>
</div>
<div style="text-align:right;">${statusBadge(o.status)}<div style="color:#f59e0b;font-weight:bold;margin-top:4px;">$${o.price}</div></div>
</div>
<div class="progress-bar"><div class="progress-fill" style="width:${prog}%;"></div></div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:14px;">
<span>${prog}% complete · ${o.clicksDelivered||0} of ${formatNum(o.visitorsTarget)} delivered</span>
<span>Started: ${o.startDate ? new Date(o.startDate).toLocaleDateString() : 'N/A'}</span>
</div>
<form action="/admin/update-progress/${o.orderId}" method="POST" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
<input type="number" name="clicks" value="${o.clicksDelivered||0}" placeholder="Visitors delivered" style="width:180px;margin:0;">
<button type="submit" class="btn-green" style="margin:0;">💾 Update Progress</button>
<a href="/admin/complete/${o.orderId}" onclick="return confirm('Mark as completed?')" style="text-decoration:none;"><button type="button" style="background:#8b5cf6;color:#fff;margin:0;">🏁 Mark Complete</button></a>
</form>
</div>`;
}).join('') || '<div style="text-align:center;padding:60px;color:#334155;border:2px dashed #1e293b;border-radius:12px;"><p>No active campaigns right now.</p></div>'}
</div>

<!-- PACKAGES -->
<div id="packages" class="panel">
<h3>📦 Edit Packages</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">Edit your service packages. Changes reflect immediately on homepage.</p>
<div class="pkg-grid">
${data.packages.map(p => `<div class="pkg-card" style="border-top:3px solid ${p.color};">
<h4>${p.emoji} ${p.name}</h4>
<form action="/admin/update-package/${p.id}" method="POST">
<label>Visitors</label><input type="number" name="visitors" value="${p.visitors}" required>
<label>Duration (days)</label><input type="number" name="duration" value="${p.duration}" required>
<label>Price (USD)</label><input type="number" name="price" value="${p.price}" step="0.01" required>
<label style="display:flex;align-items:center;gap:8px;margin-top:8px;"><input type="checkbox" name="popular" ${p.popular?'checked':''}> Mark as Popular</label>
<button class="btn-green" style="width:100%;margin-top:10px;">💾 Save</button>
</form>
</div>`).join('')}
</div>
</div>

<!-- PAYMENT SETTINGS -->
<div id="payment" class="panel">
<h3>💳 Payment Settings</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">Configure your payment methods. Only enabled methods will show to clients at checkout.</p>
<form action="/admin/save-payment" method="POST">

<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:16px;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
<h4 style="color:#fff;">🏦 Bank Transfer</h4>
<label style="display:flex;align-items:center;gap:6px;margin:0;"><input type="checkbox" name="bank_enabled" ${pmnt.enabled?.bank?'checked':''}> Enable</label>
</div>
<label>Bank Name</label><input type="text" name="bankName" value="${pmnt.bankName||''}" placeholder="e.g. First Bank Nigeria">
<label>Account Number</label><input type="text" name="bankAccount" value="${pmnt.bankAccount||''}" placeholder="0123456789">
<label>Account Holder Name</label><input type="text" name="bankHolder" value="${pmnt.bankHolder||''}" placeholder="Abdullah Haruna">
</div>

<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:16px;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
<h4 style="color:#fff;">💳 Paystack</h4>
<label style="display:flex;align-items:center;gap:6px;margin:0;"><input type="checkbox" name="paystack_enabled" ${pmnt.enabled?.paystack?'checked':''}> Enable</label>
</div>
<label>Paystack Public Key</label><input type="text" name="paystackKey" value="${pmnt.paystackKey||''}" placeholder="pk_live_...">
<label>Paystack Payment Link / ID</label><input type="text" name="paystackId" value="${pmnt.paystackId||''}" placeholder="https://paystack.com/pay/...">
</div>

<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:16px;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
<h4 style="color:#fff;">₿ Bitcoin</h4>
<label style="display:flex;align-items:center;gap:6px;margin:0;"><input type="checkbox" name="bitcoin_enabled" ${pmnt.enabled?.bitcoin?'checked':''}> Enable</label>
</div>
<label>Bitcoin Wallet Address</label><input type="text" name="bitcoinAddress" value="${pmnt.bitcoinAddress||''}" placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa">
</div>

<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:16px;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
<h4 style="color:#fff;">💵 USDT</h4>
<label style="display:flex;align-items:center;gap:6px;margin:0;"><input type="checkbox" name="usdt_enabled" ${pmnt.enabled?.usdt?'checked':''}> Enable</label>
</div>
<label>USDT Wallet Address</label><input type="text" name="usdtAddress" value="${pmnt.usdtAddress||''}" placeholder="TQfV7...">
<label>Network</label>
<select name="usdtNetwork"><option ${pmnt.usdtNetwork==='TRC20'?'selected':''}>TRC20</option><option ${pmnt.usdtNetwork==='ERC20'?'selected':''}>ERC20</option><option ${pmnt.usdtNetwork==='BEP20'?'selected':''}>BEP20</option></select>
</div>

<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:20px;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
<h4 style="color:#fff;">🅿️ PayPal</h4>
<label style="display:flex;align-items:center;gap:6px;margin:0;"><input type="checkbox" name="paypal_enabled" ${pmnt.enabled?.paypal?'checked':''}> Enable</label>
</div>
<label>PayPal Email</label><input type="email" name="paypalEmail" value="${pmnt.paypalEmail||''}" placeholder="your@paypal.com">
</div>

<button class="btn-green" style="width:100%;">💾 Save All Payment Settings</button>
</form>
</div>

<!-- TESTIMONIALS -->
<div id="testimonials" class="panel">
<h3>⭐ Manage Testimonials</h3>
<form action="/admin/add-testimonial" method="POST" style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;margin-bottom:20px;">
<h4 style="color:#f59e0b;margin-bottom:14px;">➕ Add New Testimonial</h4>
<label>Client Name</label><input type="text" name="name" placeholder="e.g. Samuel O." required>
<label>Country & Flag</label><input type="text" name="country" placeholder="🇳🇬 Nigeria">
<label>Role / Business</label><input type="text" name="role" placeholder="e.g. E-commerce Owner">
<label>Package Used</label><input type="text" name="package" placeholder="e.g. Business">
<label>Testimonial Text</label><textarea name="text" placeholder="What the client said..."></textarea>
<button class="btn-gold">⭐ Add Testimonial</button>
</form>
<table><tr><th>Name</th><th>Country</th><th>Package</th><th>Action</th></tr>
${data.testimonials.map(t => `<tr><td style="color:#fff;">${t.name}</td><td>${t.country}</td><td>${t.package}</td><td><a href="/admin/delete-testimonial/${t.id}" style="color:#ef4444;font-size:12px;" onclick="return confirm('Delete?')">Delete</a></td></tr>`).join('')}
</table>
</div>

<!-- STATS -->
<div id="stats" class="panel">
<h3>📈 Site Statistics (Homepage Counter)</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">These numbers show on your homepage to build trust. Update them as your business grows.</p>
<form action="/admin/save-stats" method="POST">
<label>Total Orders Processed (shown on homepage)</label><input type="number" name="totalOrders" value="${data.stats.totalOrders}">
<label>Total Visitors Delivered (shown on homepage)</label><input type="number" name="totalVisitors" value="${data.stats.totalVisitors}">
<label>Happy Clients (shown on homepage)</label><input type="number" name="happyClients" value="${data.stats.happyClients}">
<button class="btn-green">💾 Save Stats</button>
</form>
</div>

<!-- SECURITY -->
<div id="ceo" class="panel">
<h3>👑 CEO Free Campaign</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">Launch a free campaign for your own website — 3eesher.cloud or any site. No payment needed. Campaign activates instantly!</p>
<div style="background:#0f172a;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:20px;">
<div style="color:#f59e0b;font-weight:bold;margin-bottom:14px;">🚀 Launch CEO Test Campaign</div>
<form action="/admin/ceo-campaign" method="POST">
<label>Target Website URL *</label>
<input type="url" name="targetUrl" placeholder="https://3eesher.cloud or https://allarbaa.cloud" required>
<label>Number of Visitors</label>
<select name="visitors">
<option value="1000">1,000 visitors (Starter test)</option>
<option value="5000">5,000 visitors (Growth test)</option>
<option value="15000">15,000 visitors (Business test)</option>
<option value="50000">50,000 visitors (Premium test)</option>
</select>
<label>Campaign Duration (days)</label>
<select name="duration">
<option value="7">7 days</option>
<option value="14">14 days</option>
<option value="30">30 days</option>
</select>
<button class="btn-gold" style="width:100%;margin-top:8px;padding:14px;">🚀 Launch Free CEO Campaign</button>
</form>
</div>
<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:16px;">
<p style="color:#475569;font-size:12px;">💡 CEO campaigns are marked as FREE in your orders. Use this to test your own websites, show clients demo results, or boost your sites anytime without paying.</p>
</div>
</div>

<div id="gmail" class="panel">
<h3>📧 Email Automation Settings</h3>
<p style="color:#64748b;font-size:13px;margin-bottom:20px;">Configure Gmail to automatically send emails to clients when: order is confirmed, campaign starts, and campaign completes.</p>
<div style="background:#0f172a;border:1px solid #10b981;border-radius:10px;padding:16px;margin-bottom:16px;">
<p style="color:#10b981;font-size:13px;font-weight:bold;margin-bottom:6px;">✅ What emails get sent automatically:</p>
<p style="color:#64748b;font-size:12px;">1. <strong style="color:#fff;">Order Confirmed</strong> — When client places order</p>
<p style="color:#64748b;font-size:12px;margin-top:4px;">2. <strong style="color:#fff;">Campaign Started</strong> — When you approve/activate</p>
<p style="color:#64748b;font-size:12px;margin-top:4px;">3. <strong style="color:#fff;">Campaign Completed</strong> — When you mark complete</p>
</div>
<div style="background:#0f172a;border:1px solid #f59e0b;border-radius:10px;padding:14px;margin-bottom:16px;">
<p style="color:#f59e0b;font-size:12px;">⚠️ HOW TO GET APP PASSWORD: Gmail → Security → 2-Step Verification ON → App Passwords → Generate 16-char code. Use that as password below.</p>
</div>
<form action="/admin/save-gmail" method="POST">
<label>Your Gmail Address</label>
<input type="email" name="gmailUser" value="${data.settings?.gmailUser||''}" placeholder="abdullahharuna216@gmail.com">
<label>Gmail App Password (16-char code)</label>
<input type="text" name="gmailPass" value="${data.settings?.gmailPass||''}" placeholder="xxxx xxxx xxxx xxxx">
<button class="btn-green">💾 Save Gmail Settings</button>
</form>
<div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px;margin-top:14px;">
<p style="color:#475569;font-size:12px;">Current status: <strong style="color:${data.settings?.gmailUser?'#10b981':'#ef4444'}">${data.settings?.gmailUser ? '✅ Gmail configured — '+data.settings.gmailUser : '❌ Not configured yet'}</strong></p>
</div>
</div>

<div id="security" class="panel">
<h3>🛡️ Admin Security</h3>
<form action="/admin/change-password" method="POST">
<label>New Username</label><input type="text" name="newUser" value="${data.adminAuth.user}">
<label>New Password</label><input type="password" name="newPassword" placeholder="Enter new password" required>
<button class="btn-red">🔐 Update Credentials</button>
</form>
</div>

</div><!-- end main -->
<script>
function show(id){
    document.querySelectorAll('.panel').forEach(p=>p.style.display='none');
    document.querySelectorAll('.sidebar a[onclick]').forEach(a=>a.classList.remove('active'));
    document.getElementById(id).style.display='block';
    const t=document.getElementById('tab_'+id);if(t)t.classList.add('active');
}
document.querySelectorAll('.panel').forEach(p=>{p.style.display='none';});
document.getElementById('dash').style.display='block';
</script>
</body></html>`);
});

// ==================== ADMIN ACTIONS ====================
app.get('/admin/order/:orderId', checkAdmin, (req, res) => {
    const data = getData();
    const o = data.orders.find(o => o.orderId === req.params.orderId);
    if (!o) return res.redirect('/admin');
    const prog = Math.min(100, Math.round(((o.clicksDelivered||0)/o.visitorsTarget)*100));
    res.send(`<!DOCTYPE html><html><head><title>Order ${o.orderId}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;padding:20px;}
.container{max-width:700px;margin:0 auto;}.card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:16px;}
h2{color:#6366f1;margin-bottom:20px;}label{color:#64748b;font-size:12px;}input{width:100%;padding:10px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:6px;margin:4px 0 12px;}
button{padding:10px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;}.btn-green{background:#10b981;color:#000;}.btn-red{background:#ef4444;color:#fff;}
a{color:#6366f1;text-decoration:none;}.progress-bar{background:#1e293b;border-radius:10px;height:10px;margin:8px 0;}
.progress-fill{height:10px;border-radius:10px;background:linear-gradient(90deg,#6366f1,#10b981);}
</style></head>
<body><div class="container">
<a href="/admin" style="font-size:13px;">← Back to Admin</a>
<h2 style="margin-top:16px;">Order Details — ${o.orderId}</h2>
<div class="card">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
<div><label>CLIENT</label><div style="color:#fff;font-weight:bold;">${o.clientName}</div><div style="color:#64748b;font-size:12px;">${o.clientEmail}</div></div>
<div><label>STATUS</label><div>${statusBadge(o.status)}</div></div>
<div><label>PACKAGE</label><div style="color:#fff;">${o.packageName} — ${formatNum(o.visitorsTarget)} visitors</div></div>
<div><label>PRICE</label><div style="color:#f59e0b;font-weight:bold;font-size:1.2rem;">$${o.price}</div></div>
<div><label>TARGET URL</label><div><a href="${o.targetUrl}" target="_blank">${o.targetUrl}</a></div></div>
<div><label>PAYMENT METHOD</label><div style="color:#fff;">${o.paymentMethod}</div></div>
<div><label>ORDER DATE</label><div style="color:#fff;">${new Date(o.createdAt).toLocaleString()}</div></div>
<div><label>DURATION</label><div style="color:#fff;">${o.duration} days</div></div>
</div>
</div>
<div class="card">
<label>DELIVERY PROGRESS</label>
<div class="progress-bar"><div class="progress-fill" style="width:${prog}%;"></div></div>
<div style="color:#64748b;font-size:12px;">${o.clicksDelivered||0} / ${formatNum(o.visitorsTarget)} visitors (${prog}%)</div>
<form action="/admin/update-progress/${o.orderId}" method="POST" style="margin-top:14px;display:flex;gap:10px;">
<input type="number" name="clicks" value="${o.clicksDelivered||0}" style="margin:0;">
<button type="submit" class="btn-green">Update</button>
</form>
</div>
${o.receiptFile ? `<div class="card"><label>PAYMENT RECEIPT</label><br><a href="/receipts/${o.receiptFile}" target="_blank" style="background:#1e293b;color:#6366f1;padding:8px 16px;border-radius:6px;display:inline-block;margin-top:8px;">📄 View Receipt</a></div>` : ''}
${o.paymentNote ? `<div class="card"><label>CLIENT PAYMENT NOTE</label><p style="color:#94a3b8;margin-top:6px;">${o.paymentNote}</p></div>` : ''}
<div style="display:flex;gap:10px;flex-wrap:wrap;">
${o.status==='payment_review'||o.status==='pending'?`<a href="/admin/approve/${o.orderId}" onclick="return confirm('Approve?')"><button class="btn-green">✅ Approve & Activate</button></a>`:''}
${o.status==='active'?`<a href="/admin/complete/${o.orderId}" onclick="return confirm('Mark complete?')"><button style="background:#8b5cf6;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">🏁 Mark Complete</button></a>`:''}
<a href="/admin/cancel/${o.orderId}" onclick="return confirm('Cancel?')"><button class="btn-red">❌ Cancel</button></a>
</div>
</div></body></html>`);
});

app.get('/admin/approve/:orderId', checkAdmin, (req, res) => {
    const data = getData();
    const o = data.orders.find(o => o.orderId === req.params.orderId);
    if (o) {
        o.status = 'active';
        o.startDate = new Date().toISOString();
        const end = new Date(); end.setDate(end.getDate() + o.duration);
        o.endDate = end.toISOString();
        data.stats.totalOrders = (data.stats.totalOrders || 0) + 1;
        saveData(data);
        emailCampaignStarted(o);
    } else { saveData(data); }
    res.send('<script>alert("✅ Order Approved! Campaign is now Active. Client has been notified by email."); window.location.href="/admin";</script>');
});

app.get('/admin/complete/:orderId', checkAdmin, (req, res) => {
    const data = getData();
    const o = data.orders.find(o => o.orderId === req.params.orderId);
    if (o) {
        o.status = 'completed'; o.completedAt = new Date().toISOString();
        o.clicksDelivered = o.visitorsTarget;
        data.stats.happyClients = (data.stats.happyClients||0) + 1;
        data.stats.totalVisitors = (data.stats.totalVisitors||0) + o.visitorsTarget;
        saveData(data);
        emailCampaignCompleted(o);
    } else { saveData(data); }
    res.send('<script>alert("🏁 Campaign marked as Complete! Client has been notified by email."); window.location.href="/admin";</script>');
});

app.post('/admin/update-progress/:orderId', checkAdmin, (req, res) => {
    const data = getData();
    const o = data.orders.find(o => o.orderId === req.params.orderId);
    if (o) o.clicksDelivered = parseInt(req.body.clicks) || 0;
    saveData(data);
    res.redirect('/admin');
});

// ==================== CEO FREE CAMPAIGN ====================
app.post('/admin/ceo-campaign', checkAdmin, (req, res) => {
    const data = getData();
    const orderId = generateOrderId();
    const visitors = parseInt(req.body.visitors) || 1000;
    const duration = parseInt(req.body.duration) || 7;
    const endDate = new Date(); endDate.setDate(endDate.getDate() + duration);
    const order = {
        orderId,
        clientName: 'TICHER (CEO)',
        clientEmail: CONTACT_EMAIL,
        clientWhatsApp: '',
        targetUrl: req.body.targetUrl,
        packageId: 0,
        packageName: '👑 CEO FREE CAMPAIGN',
        visitorsTarget: visitors,
        duration,
        price: 0,
        paymentMethod: 'CEO Access — Free',
        paymentNote: 'Internal CEO test campaign — no payment required',
        receiptFile: null,
        status: 'active',
        clicksDelivered: 0,
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        isCeo: true
    };
    data.orders.unshift(order);
    saveData(data);
    res.send(`<script>alert("🚀 CEO Campaign Created! Order ID: ${orderId}\\nStatus: ACTIVE — No payment needed!"); window.location.href="/admin";</script>`);
});

// ==================== GMAIL SETTINGS ====================
app.post('/admin/save-gmail', checkAdmin, (req, res) => {
    const data = getData();
    if (!data.settings) data.settings = {};
    data.settings.gmailUser = req.body.gmailUser || '';
    data.settings.gmailPass = req.body.gmailPass || '';
    saveData(data);
    res.send('<script>alert("✅ Gmail Saved! Emails will now be sent to clients automatically."); window.location.href="/admin";</script>');
});

app.get('/admin/cancel/:orderId', checkAdmin, (req, res) => {
    const data = getData();
    const o = data.orders.find(o => o.orderId === req.params.orderId);
    if (o) o.status = 'cancelled';
    saveData(data);
    res.redirect('/admin');
});

app.post('/admin/update-package/:id', checkAdmin, (req, res) => {
    const data = getData();
    const p = data.packages.find(p => p.id == req.params.id);
    if (p) { p.visitors = parseInt(req.body.visitors); p.duration = parseInt(req.body.duration); p.price = parseFloat(req.body.price); p.popular = !!req.body.popular; }
    saveData(data);
    res.send('<script>alert("Package updated!"); window.location.href="/admin";</script>');
});

app.post('/admin/save-payment', checkAdmin, (req, res) => {
    const data = getData();
    data.payment = {
        bankName: req.body.bankName||'', bankAccount: req.body.bankAccount||'', bankHolder: req.body.bankHolder||'',
        paystackKey: req.body.paystackKey||'', paystackId: req.body.paystackId||'',
        bitcoinAddress: req.body.bitcoinAddress||'',
        usdtAddress: req.body.usdtAddress||'', usdtNetwork: req.body.usdtNetwork||'TRC20',
        paypalEmail: req.body.paypalEmail||'',
        enabled: {
            bank: !!req.body.bank_enabled, paystack: !!req.body.paystack_enabled,
            bitcoin: !!req.body.bitcoin_enabled, usdt: !!req.body.usdt_enabled, paypal: !!req.body.paypal_enabled
        }
    };
    saveData(data);
    res.send('<script>alert("✅ Payment Settings Saved!"); window.location.href="/admin";</script>');
});

app.post('/admin/save-stats', checkAdmin, (req, res) => {
    const data = getData();
    data.stats = { totalOrders: parseInt(req.body.totalOrders)||0, totalVisitors: parseInt(req.body.totalVisitors)||0, happyClients: parseInt(req.body.happyClients)||0 };
    saveData(data);
    res.send('<script>alert("Stats updated!"); window.location.href="/admin";</script>');
});

app.post('/admin/add-testimonial', checkAdmin, (req, res) => {
    const data = getData();
    if (!data.testimonials) data.testimonials = [];
    data.testimonials.push({ id: Date.now(), name: req.body.name, country: req.body.country||'', role: req.body.role||'', text: req.body.text, stars: 5, package: req.body.package||'' });
    saveData(data);
    res.send('<script>alert("Testimonial added!"); window.location.href="/admin";</script>');
});

app.get('/admin/delete-testimonial/:id', checkAdmin, (req, res) => {
    const data = getData();
    data.testimonials = data.testimonials.filter(t => t.id != req.params.id);
    saveData(data);
    res.redirect('/admin');
});

app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData();
    data.adminAuth.user = req.body.newUser;
    data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10);
    saveData(data);
    res.send('<script>alert("Credentials Updated!"); window.location.href="/admin";</script>');
});

// serve receipts
app.use('/receipts', express.static(RECEIPTS_DIR));

// ==================== ORDER SUBMISSION ====================
app.post('/submit-order', upload.single('receipt'), (req, res) => {
    const data = getData();
    const pkg = data.packages.find(p => p.id == req.body.packageId);
    if (!pkg) return res.send('<script>alert("Invalid package!"); history.back();</script>');

    const orderId = generateOrderId();
    const order = {
        orderId,
        clientName: req.body.name,
        clientEmail: req.body.email,
        clientWhatsApp: req.body.whatsapp || '',
        targetUrl: req.body.targetUrl,
        packageId: pkg.id,
        packageName: pkg.name,
        visitorsTarget: pkg.visitors,
        duration: pkg.duration,
        price: pkg.price,
        paymentMethod: req.body.paymentMethod,
        paymentNote: req.body.paymentNote || '',
        receiptFile: req.file ? req.file.filename : null,
        status: req.file || req.body.paymentNote ? 'payment_review' : 'pending',
        clicksDelivered: 0,
        createdAt: new Date().toISOString(),
        startDate: null,
        endDate: null
    };

    data.orders.unshift(order);
    saveData(data);

    // Send confirmation email to client
    emailOrderConfirmed(order);

    res.send(`<!DOCTYPE html><html><head>
<title>Order Confirmed — Allarbaa Boost</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}
.box{background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:40px;max-width:500px;width:100%;text-align:center;}
.check{font-size:4rem;margin-bottom:16px;}
h2{color:#10b981;margin-bottom:8px;}
.oid{background:#1e293b;border-radius:10px;padding:14px;margin:20px 0;font-size:1.2rem;font-weight:bold;color:#6366f1;letter-spacing:2px;}
p{color:#64748b;line-height:1.7;margin-bottom:12px;}
a{display:inline-block;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px;}
</style></head>
<body><div class="box">
<div class="check">✅</div>
<h2>Order Confirmed!</h2>
<p>Your order has been received and is under review.</p>
<div class="oid">${orderId}</div>
<p>Save your Order ID above. You can use it to track your campaign status anytime.</p>
<p>We will review your payment and activate your campaign within <strong style="color:#10b981;">24 hours</strong>.</p>
<p>Contact: <a href="mailto:${CONTACT_EMAIL}" style="background:none;color:#6366f1;padding:0;">${CONTACT_EMAIL}</a></p>
<a href="/">← Back to Home</a>
<a href="/track-order?id=${orderId}" style="margin-left:10px;background:#1e293b;">📊 Track Order</a>
</div></body></html>`);
});

// ==================== ORDER TRACKING ====================
app.get('/track-order', (req, res) => {
    const data = getData();
    const orderId = req.query.id || '';
    const o = orderId ? data.orders.find(o => o.orderId === orderId) : null;

    res.send(`<!DOCTYPE html><html><head>
<title>Track Order — Allarbaa Boost</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;padding:20px;}
header{background:#0a0f1e;border-bottom:1px solid #1e293b;padding:16px 5%;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;}
.logo{font-size:1.4rem;font-weight:900;background:linear-gradient(135deg,#6366f1,#10b981);-webkit-background-clip:text;color:transparent;text-decoration:none;}
.container{max-width:600px;margin:40px auto;}
.card{background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:24px;margin-bottom:16px;}
h1{color:#fff;margin-bottom:20px;}
input{width:100%;padding:12px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;margin-bottom:12px;}
button{background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:12px 24px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;}
.progress-bar{background:#1e293b;border-radius:10px;height:12px;margin:12px 0;}
.progress-fill{height:12px;border-radius:10px;background:linear-gradient(90deg,#6366f1,#10b981);}
a{color:#6366f1;text-decoration:none;}
.step{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1e293b;}
.step-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0;}
</style></head>
<body>
<header>
<a href="/" class="logo">⚡ Allarbaa Boost</a>
<a href="/" style="color:#64748b;font-size:13px;">← Home</a>
</header>
<div class="container">
<h1>📊 Track Your Campaign</h1>
<div class="card">
<form action="/track-order" method="GET">
<label style="color:#64748b;font-size:12px;display:block;margin-bottom:6px;">Enter your Order ID</label>
<input name="id" value="${orderId}" placeholder="e.g. AB1X2Y3Z">
<button>🔍 Track Order</button>
</form>
</div>

${o ? (() => {
    const prog = Math.min(100, Math.round(((o.clicksDelivered||0)/o.visitorsTarget)*100));
    return `<div class="card">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div><div style="color:#6366f1;font-weight:bold;font-size:0.9rem;">ORDER ID</div><div style="color:#fff;font-size:1.1rem;font-weight:bold;">${o.orderId}</div></div>
<div>${statusBadge(o.status)}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
<div style="background:#1e293b;border-radius:8px;padding:12px;"><div style="color:#64748b;font-size:11px;">PACKAGE</div><div style="color:#fff;font-weight:bold;">${o.packageName}</div></div>
<div style="background:#1e293b;border-radius:8px;padding:12px;"><div style="color:#64748b;font-size:11px;">VISITORS TARGET</div><div style="color:#fff;font-weight:bold;">${formatNum(o.visitorsTarget)}</div></div>
<div style="background:#1e293b;border-radius:8px;padding:12px;"><div style="color:#64748b;font-size:11px;">DELIVERED</div><div style="color:#10b981;font-weight:bold;">${formatNum(o.clicksDelivered||0)}</div></div>
<div style="background:#1e293b;border-radius:8px;padding:12px;"><div style="color:#64748b;font-size:11px;">DURATION</div><div style="color:#fff;font-weight:bold;">${o.duration} days</div></div>
</div>
<div style="color:#64748b;font-size:12px;margin-bottom:6px;">DELIVERY PROGRESS</div>
<div class="progress-bar"><div class="progress-fill" style="width:${prog}%;"></div></div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;"><span>${prog}% complete</span><span>${formatNum(o.clicksDelivered||0)} / ${formatNum(o.visitorsTarget)}</span></div>

<div style="margin-top:20px;border-top:1px solid #1e293b;padding-top:16px;">
${[
    { status: 'Order Received', done: true },
    { status: 'Payment Review', done: ['payment_review','active','completed'].includes(o.status) },
    { status: 'Campaign Active', done: ['active','completed'].includes(o.status) },
    { status: 'Completed', done: o.status === 'completed' }
].map(step => `<div class="step">
<div class="step-icon" style="background:${step.done?'#10b981':'#1e293b'};color:${step.done?'#000':'#475569'};">${step.done?'✓':'○'}</div>
<div style="color:${step.done?'#fff':'#475569'};">${step.status}</div>
</div>`).join('')}
</div>
</div>

<div class="card">
<p style="color:#64748b;font-size:13px;">Need help? Contact us with your Order ID:</p>
<p style="margin-top:8px;"><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</div>`;
})() : (orderId ? '<div class="card" style="text-align:center;color:#ef4444;">❌ Order not found. Please check your Order ID.</div>' : '')}

</div></body></html>`);
});

// ==================== CHECKOUT PAGE ====================
app.get('/order', (req, res) => {
    const data = getData();
    const pkgId = parseInt(req.query.pkg) || 1;
    const pkg = data.packages.find(p => p.id === pkgId) || data.packages[0];
    const pmnt = data.payment;

    const paymentOptions = [];
    if (pmnt.enabled?.bank && pmnt.bankAccount) paymentOptions.push({ id: 'bank', label: '🏦 Bank Transfer', desc: 'Transfer to our bank account' });
    if (pmnt.enabled?.paystack && pmnt.paystackId) paymentOptions.push({ id: 'paystack', label: '💳 Paystack', desc: 'Pay with card via Paystack' });
    if (pmnt.enabled?.bitcoin && pmnt.bitcoinAddress) paymentOptions.push({ id: 'bitcoin', label: '₿ Bitcoin', desc: 'Pay with Bitcoin (BTC)' });
    if (pmnt.enabled?.usdt && pmnt.usdtAddress) paymentOptions.push({ id: 'usdt', label: '💵 USDT', desc: `Pay with USDT (${pmnt.usdtNetwork})` });
    if (pmnt.enabled?.paypal && pmnt.paypalEmail) paymentOptions.push({ id: 'paypal', label: '🅿️ PayPal', desc: 'Pay with PayPal' });
    if (paymentOptions.length === 0) paymentOptions.push({ id: 'manual', label: '📧 Manual Payment', desc: 'Contact us for payment details' });

    res.send(`<!DOCTYPE html><html><head>
<title>Order ${pkg.name} Package — Allarbaa Boost</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#030712;color:#f8fafc;font-family:'Segoe UI',sans-serif;}
header{background:#0a0f1e;border-bottom:1px solid #1e293b;padding:16px 5%;display:flex;justify-content:space-between;align-items:center;}
.logo{font-size:1.4rem;font-weight:900;background:linear-gradient(135deg,#6366f1,#10b981);-webkit-background-clip:text;color:transparent;text-decoration:none;}
.container{max-width:700px;margin:0 auto;padding:30px 16px;}
.card{background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:24px;margin-bottom:20px;}
h2{color:#fff;margin-bottom:6px;}
input,textarea,select{width:100%;padding:12px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;margin-top:6px;margin-bottom:14px;font-size:14px;}
label{color:#64748b;font-size:12px;display:block;}
.btn{background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;padding:16px;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;width:100%;margin-top:8px;}
.pkg-summary{background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(16,185,129,0.1));border:1px solid #6366f1;border-radius:12px;padding:20px;margin-bottom:20px;}
.payment-opt{border:2px solid #1e293b;border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;}
.payment-opt:hover,.payment-opt.selected{border-color:#6366f1;background:rgba(99,102,241,0.08);}
.payment-opt input[type=radio]{margin-right:10px;}
.pay-detail{background:#1e293b;border-radius:8px;padding:14px;margin-top:10px;display:none;}
.copy-btn{background:#334155;color:#94a3b8;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;float:right;}
.copy-btn:hover{background:#475569;color:#fff;}
</style></head>
<body>
<header>
<a href="/" class="logo">⚡ Allarbaa Boost</a>
<a href="/" style="color:#64748b;font-size:13px;">← Back</a>
</header>
<div class="container">

<div class="pkg-summary">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
<div>
<div style="font-size:0.85rem;color:#64748b;">You selected:</div>
<div style="font-size:1.5rem;font-weight:900;color:#fff;">${pkg.emoji} ${pkg.name} Package</div>
<div style="color:#64748b;font-size:0.9rem;margin-top:4px;">${formatNum(pkg.visitors)} real visitors · ${pkg.duration} days campaign</div>
</div>
<div style="text-align:right;">
<div style="font-size:2.2rem;font-weight:900;color:#10b981;">$${pkg.price}</div>
<div style="color:#64748b;font-size:12px;">USD</div>
</div>
</div>
<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
${(pkg.features||[]).slice(0,3).map(f => `<span style="background:rgba(16,185,129,0.1);color:#10b981;padding:4px 10px;border-radius:20px;font-size:12px;">✓ ${f}</span>`).join('')}
</div>
</div>

<div class="card">
<h2>👤 Your Information</h2>
<form action="/submit-order" method="POST" enctype="multipart/form-data" id="orderForm">
<input type="hidden" name="packageId" value="${pkg.id}">

<label>Full Name *</label>
<input type="text" name="name" placeholder="Your full name" required>

<label>Email Address *</label>
<input type="email" name="email" placeholder="your@email.com" required>

<label>WhatsApp Number (for campaign updates)</label>
<input type="text" name="whatsapp" placeholder="+2348012345678">

<label>Website / App URL to Boost *</label>
<input type="url" name="targetUrl" placeholder="https://yourwebsite.com" required>

<label>Additional Notes (optional)</label>
<textarea name="targetNotes" rows="2" placeholder="Any specific targeting or notes..."></textarea>

<h2 style="margin:16px 0 14px;">💳 Choose Payment Method</h2>
${paymentOptions.map((opt, i) => `
<div class="payment-opt ${i===0?'selected':''}" onclick="selectPayment('${opt.id}', this)">
<label style="cursor:pointer;color:#fff;display:flex;align-items:center;gap:10px;">
<input type="radio" name="paymentMethod" value="${opt.id}" ${i===0?'checked':''} style="margin:0;width:auto;">
<div><div style="font-weight:600;">${opt.label}</div><div style="color:#64748b;font-size:12px;">${opt.desc}</div></div>
</label>
</div>
${opt.id === 'bank' ? `<div id="detail_bank" class="pay-detail" style="${i===0?'display:block':''}">
<div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">Transfer $${pkg.price} USD equivalent to:</div>
<div style="color:#fff;font-weight:bold;">${pmnt.bankName||''}</div>
<div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="color:#64748b;font-size:11px;">Account Number</div><div style="color:#10b981;font-size:1.1rem;font-weight:bold;">${pmnt.bankAccount||''}</div></div><button type="button" class="copy-btn" onclick="copyText('${pmnt.bankAccount||''}')">Copy</button></div>
<div style="color:#64748b;font-size:12px;margin-top:4px;">Account Name: ${pmnt.bankHolder||''}</div>
<div style="background:#0f172a;border-radius:6px;padding:10px;margin-top:10px;color:#f59e0b;font-size:12px;">⚠️ After transfer, upload your receipt below and add your transaction reference in the note.</div>
</div>` : ''}
${opt.id === 'paystack' ? `<div id="detail_paystack" class="pay-detail" style="${i===0?'display:block':''}">
<div style="color:#94a3b8;font-size:13px;margin-bottom:10px;">Click the button to pay securely via Paystack:</div>
<a href="${pmnt.paystackId||'#'}" target="_blank" style="display:block;background:#10b981;color:#000;padding:12px;border-radius:8px;text-align:center;font-weight:bold;text-decoration:none;">💳 Pay $${pkg.price} via Paystack →</a>
<div style="color:#64748b;font-size:12px;margin-top:10px;">After payment, come back and enter your payment reference in the note below.</div>
</div>` : ''}
${opt.id === 'bitcoin' ? `<div id="detail_bitcoin" class="pay-detail" style="${i===0?'display:block':''}">
<div style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Send Bitcoin (BTC) equivalent of $${pkg.price} USD to:</div>
<div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:#f59e0b;font-size:0.85rem;word-break:break-all;">${pmnt.bitcoinAddress||''}</div><button type="button" class="copy-btn" onclick="copyText('${pmnt.bitcoinAddress||''}')">Copy</button></div>
<div style="color:#64748b;font-size:12px;margin-top:8px;">After sending, paste your transaction hash in the note below.</div>
</div>` : ''}
${opt.id === 'usdt' ? `<div id="detail_usdt" class="pay-detail" style="${i===0?'display:block':''}">
<div style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Send $${pkg.price} USDT (${pmnt.usdtNetwork||'TRC20'}) to:</div>
<div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:#10b981;font-size:0.85rem;word-break:break-all;">${pmnt.usdtAddress||''}</div><button type="button" class="copy-btn" onclick="copyText('${pmnt.usdtAddress||''}')">Copy</button></div>
<div style="color:#64748b;font-size:12px;margin-top:8px;">Network: <strong>${pmnt.usdtNetwork||'TRC20'}</strong> — After sending, paste your TX hash in the note.</div>
</div>` : ''}
${opt.id === 'paypal' ? `<div id="detail_paypal" class="pay-detail" style="${i===0?'display:block':''}">
<div style="color:#94a3b8;font-size:13px;margin-bottom:10px;">Send $${pkg.price} USD to this PayPal email:</div>
<div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:#6366f1;font-weight:bold;">${pmnt.paypalEmail||''}</div><button type="button" class="copy-btn" onclick="copyText('${pmnt.paypalEmail||''}')">Copy</button></div>
<div style="color:#f59e0b;font-size:12px;margin-top:8px;">⚠️ Send as "Friends & Family" to avoid fees. Add Order Package name in payment note.</div>
</div>` : ''}
`).join('')}

<label style="margin-top:16px;">Payment Reference / Transaction Note</label>
<textarea name="paymentNote" rows="2" placeholder="Paste your transaction reference, hash, or any payment proof here..."></textarea>

<label>Upload Payment Receipt (image/PDF — max 10MB)</label>
<input type="file" name="receipt" accept="image/*,.pdf">

<button type="submit" class="btn">🚀 Place Order — $${pkg.price}</button>
<p style="text-align:center;color:#475569;font-size:12px;margin-top:10px;">Your campaign will be activated within 24 hours after payment confirmation.</p>
</form>
</div>

<div style="text-align:center;color:#475569;font-size:13px;">
Questions? Email us: <a href="mailto:${CONTACT_EMAIL}" style="color:#6366f1;">${CONTACT_EMAIL}</a>
</div>
</div>

<script>
function selectPayment(id, el) {
    document.querySelectorAll('.payment-opt').forEach(o=>{o.classList.remove('selected');});
    el.classList.add('selected');
    el.querySelector('input[type=radio]').checked = true;
    document.querySelectorAll('.pay-detail').forEach(d=>d.style.display='none');
    const det = document.getElementById('detail_'+id);
    if(det) det.style.display='block';
}
function copyText(text) {
    navigator.clipboard.writeText(text).then(()=>alert('✅ Copied!')).catch(()=>{
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        alert('✅ Copied!');
    });
}
</script>
</body></html>`);
});

// ==================== HOMEPAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    const pkgs = data.packages;
    const stats = data.stats;

    const pkgHtml = pkgs.map(p => `
<div class="pkg-card ${p.popular ? 'popular' : ''}" style="border-top:3px solid ${p.color};">
${p.popular ? '<div class="popular-badge">⭐ Most Popular</div>' : ''}
<div class="pkg-emoji">${p.emoji}</div>
<div class="pkg-name">${p.name}</div>
<div class="pkg-price">$${p.price}<span style="font-size:1rem;color:#64748b;font-weight:400;">/campaign</span></div>
<div class="pkg-visitors" style="color:${p.color};">${formatNum(p.visitors)} Visitors</div>
<div class="pkg-duration">${p.duration} Days Campaign</div>
<ul class="pkg-features">
${(p.features||[]).map(f => `<li>✓ ${f}</li>`).join('')}
</ul>
<a href="/order?pkg=${p.id}" class="pkg-btn" style="background:${p.color};color:${['#f59e0b','#10b981'].includes(p.color)?'#000':'#fff'};">Get Started →</a>
</div>`).join('');

    const testimonialHtml = data.testimonials.map(t => `
<div class="testi-card">
<div class="stars">${'⭐'.repeat(t.stars||5)}</div>
<p class="testi-text">"${t.text}"</p>
<div class="testi-author">
<div class="testi-name">${t.name}</div>
<div class="testi-role">${t.country} · ${t.role}</div>
<div class="testi-pkg">Used: ${t.package} Package</div>
</div>
</div>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Allarbaa Boost — Real Website Traffic. Guaranteed visitors for your website, app or blog. Affordable packages starting at $5.">
<title>Allarbaa Boost — Real Website Traffic Service</title>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>
:root{--primary:#6366f1;--green:#10b981;--bg:#030712;--card:#0f172a;--border:#1e293b;--text:#f8fafc;--muted:#64748b;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}

/* NAV */
nav{background:rgba(3,7,18,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:16px 5%;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:1000;}
.nav-logo{font-size:1.4rem;font-weight:900;background:linear-gradient(135deg,var(--primary),var(--green));-webkit-background-clip:text;color:transparent;text-decoration:none;}
.nav-links{display:flex;gap:20px;align-items:center;}
.nav-links a{color:var(--muted);text-decoration:none;font-size:14px;transition:color 0.2s;}
.nav-links a:hover{color:#fff;}
.nav-btn{background:linear-gradient(135deg,var(--primary),var(--green));color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;}

/* HERO */
.hero{padding:100px 5% 80px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.15),transparent 70%);}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);color:var(--primary);padding:6px 16px;border-radius:30px;font-size:13px;font-weight:600;margin-bottom:24px;}
.hero h1{font-size:clamp(2.2rem,5vw,3.8rem);font-weight:900;line-height:1.1;margin-bottom:20px;}
.hero h1 span{background:linear-gradient(135deg,var(--primary),var(--green));-webkit-background-clip:text;color:transparent;}
.hero p{font-size:1.15rem;color:var(--muted);max-width:600px;margin:0 auto 36px;}
.hero-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--green));color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:1rem;transition:transform 0.2s,box-shadow 0.2s;}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,0.4);}
.btn-secondary{background:rgba(255,255,255,0.05);border:1px solid var(--border);color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:1rem;transition:all 0.2s;}
.btn-secondary:hover{background:rgba(255,255,255,0.1);}

/* STATS TICKER */
.stats-bar{background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:28px 5%;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;text-align:center;}
.stat-item .num{font-size:2.2rem;font-weight:900;background:linear-gradient(135deg,var(--primary),var(--green));-webkit-background-clip:text;color:transparent;}
.stat-item .lbl{color:var(--muted);font-size:13px;margin-top:4px;}

/* HOW IT WORKS */
.section{padding:80px 5%;}
.section-center{text-align:center;max-width:800px;margin:0 auto;}
.section-badge{display:inline-block;background:rgba(99,102,241,0.1);color:var(--primary);padding:6px 16px;border-radius:30px;font-size:12px;font-weight:600;margin-bottom:14px;letter-spacing:1px;text-transform:uppercase;}
.section h2{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:900;margin-bottom:14px;}
.section p.sub{color:var(--muted);font-size:1.05rem;margin-bottom:50px;}
.steps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:1100px;margin:0 auto;}
.step-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center;transition:transform 0.2s;}
.step-card:hover{transform:translateY(-4px);}
.step-num{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--green));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.3rem;font-weight:900;}
.step-card h3{color:#fff;margin-bottom:8px;}
.step-card p{color:var(--muted);font-size:0.9rem;}

/* PACKAGES */
.packages-section{padding:80px 5%;background:radial-gradient(ellipse at 50% 50%,rgba(99,102,241,0.05),transparent 70%);}
.packages-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;max-width:1200px;margin:0 auto;}
.pkg-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;position:relative;transition:all 0.3s;}
.pkg-card:hover{transform:translateY(-6px);box-shadow:0 20px 50px rgba(0,0,0,0.4);}
.pkg-card.popular{border-color:var(--primary);box-shadow:0 0 30px rgba(99,102,241,0.2);}
.popular-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--primary),var(--green));color:#fff;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;}
.pkg-emoji{font-size:2rem;margin-bottom:10px;}
.pkg-name{font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:6px;}
.pkg-price{font-size:2.4rem;font-weight:900;color:#fff;margin-bottom:4px;}
.pkg-visitors{font-weight:700;font-size:1rem;margin-bottom:4px;}
.pkg-duration{color:var(--muted);font-size:0.85rem;margin-bottom:16px;}
.pkg-features{list-style:none;margin-bottom:20px;}
.pkg-features li{color:#94a3b8;font-size:0.85rem;padding:5px 0;border-bottom:1px solid #1e293b;}
.pkg-features li:last-child{border:none;}
.pkg-btn{display:block;text-align:center;padding:12px;border-radius:10px;font-weight:700;text-decoration:none;font-size:0.95rem;transition:all 0.2s;}
.pkg-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}

/* TRAFFIC SOURCES */
.sources-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;max-width:1000px;margin:0 auto;}
.source-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;}
.source-icon{font-size:2rem;margin-bottom:10px;}
.source-card h4{color:#fff;font-size:0.95rem;margin-bottom:4px;}
.source-card p{color:var(--muted);font-size:0.8rem;}

/* TESTIMONIALS */
.testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;max-width:1200px;margin:0 auto;}
.testi-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;}
.stars{font-size:1.1rem;margin-bottom:12px;}
.testi-text{color:#94a3b8;font-size:0.9rem;line-height:1.7;margin-bottom:16px;font-style:italic;}
.testi-name{color:#fff;font-weight:700;}
.testi-role{color:var(--muted);font-size:12px;margin-top:2px;}
.testi-pkg{color:var(--primary);font-size:11px;margin-top:4px;}

/* FAQ */
.faq-list{max-width:800px;margin:0 auto;}
.faq-item{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px;margin-bottom:12px;cursor:pointer;}
.faq-q{color:#fff;font-weight:600;display:flex;justify-content:space-between;align-items:center;}
.faq-a{color:var(--muted);font-size:0.9rem;margin-top:12px;line-height:1.7;display:none;}
.faq-item.open .faq-a{display:block;}
.faq-item.open .faq-arrow{transform:rotate(180deg);}
.faq-arrow{transition:transform 0.2s;}

/* CTA */
.cta-section{padding:80px 5%;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(16,185,129,0.08));}
.cta-section h2{font-size:2.5rem;font-weight:900;margin-bottom:14px;}
.cta-section p{color:var(--muted);margin-bottom:30px;}

/* FOOTER */
footer{background:#020817;border-top:1px solid var(--border);padding:32px 5%;text-align:center;color:var(--muted);font-size:13px;}
footer a{color:var(--primary);text-decoration:none;margin:0 8px;}

/* RESPONSIVE */
@media(max-width:600px){.nav-links{gap:12px;}.hero{padding:60px 5% 50px;}.hero-btns{flex-direction:column;align-items:center;}}
</style>
</head>
<body>

<nav>
<a href="/" class="nav-logo">⚡ Allarbaa Boost</a>
<div class="nav-links">
<a href="#how-it-works">How It Works</a>
<a href="#packages">Packages</a>
<a href="#testimonials">Reviews</a>
<a href="/track-order">Track Order</a>
<a href="#packages" class="nav-btn">Get Traffic →</a>
</div>
</nav>

<!-- HERO -->
<section class="hero">
<div class="hero-badge">⚡ Real Traffic · Guaranteed Results</div>
<h1>Boost Your Website With<br><span>Real Visitors</span></h1>
<p>Drive thousands of real, targeted visitors to your website, app, or blog. Affordable packages starting from just $5. Campaigns start within 24 hours.</p>
<div class="hero-btns">
<a href="#packages" class="btn-primary">🚀 See Packages</a>
<a href="/track-order" class="btn-secondary">📊 Track Order</a>
</div>
</section>

<!-- 3 FEATURE PHOTOS -->
<section style="padding:60px 5% 20px;">
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;max-width:1200px;margin:0 auto;">
<div style="border-radius:16px;overflow:hidden;position:relative;">
<img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&auto=format&fit=crop" alt="Traffic Growth Analytics" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px;">
<div style="color:#10b981;font-weight:700;font-size:1rem;">📈 Real Traffic Growth</div>
<div style="color:#94a3b8;font-size:13px;margin-top:4px;">Watch your analytics grow with real engaged visitors</div>
</div>
</div>
<div style="border-radius:16px;overflow:hidden;position:relative;">
<img src="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=700&auto=format&fit=crop" alt="Global Campaign Reach" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px;">
<div style="color:#6366f1;font-weight:700;font-size:1rem;">🌍 Global Audience Reach</div>
<div style="color:#94a3b8;font-size:13px;margin-top:4px;">Reach real people across Africa and worldwide</div>
</div>
</div>
<div style="border-radius:16px;overflow:hidden;position:relative;">
<img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&auto=format&fit=crop" alt="Campaign Tracking Dashboard" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px;">
<div style="color:#f59e0b;font-weight:700;font-size:1rem;">📊 Live Campaign Tracking</div>
<div style="color:#94a3b8;font-size:13px;margin-top:4px;">Track every visitor delivered in real-time</div>
</div>
</div>
</div>
</section>

<!-- STATS -->
<div class="stats-bar">
<div class="stat-item"><div class="num">${formatNum(stats.totalOrders)}+</div><div class="lbl">Orders Processed</div></div>
<div class="stat-item"><div class="num">${formatNum(stats.totalVisitors)}+</div><div class="lbl">Visitors Delivered</div></div>
<div class="stat-item"><div class="num">${formatNum(stats.happyClients)}+</div><div class="lbl">Happy Clients</div></div>
<div class="stat-item"><div class="num">24h</div><div class="lbl">Campaign Start Time</div></div>
</div>

<!-- 3 FEATURE PHOTOS -->
<section style="padding:60px 5%;background:rgba(99,102,241,0.03);">
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;max-width:1100px;margin:0 auto;">
<div style="border-radius:16px;overflow:hidden;position:relative;border:1px solid #1e293b;">
<img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop" alt="Website Traffic Analytics" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px 16px;">
<div style="color:#6366f1;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">📈 Traffic Growth</div>
<div style="color:#fff;font-weight:700;margin-top:4px;">Watch your analytics grow in real time</div>
</div>
</div>
<div style="border-radius:16px;overflow:hidden;position:relative;border:1px solid #1e293b;">
<img src="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&auto=format&fit=crop" alt="Global Digital Campaign" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px 16px;">
<div style="color:#10b981;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">🌍 Global Reach</div>
<div style="color:#fff;font-weight:700;margin-top:4px;">Real visitors from across Africa & beyond</div>
</div>
</div>
<div style="border-radius:16px;overflow:hidden;position:relative;border:1px solid #1e293b;">
<img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop" alt="Business Results Dashboard" style="width:100%;height:220px;object-fit:cover;display:block;">
<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(3,7,18,0.95));padding:20px 16px;">
<div style="color:#f59e0b;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">📊 Proven Results</div>
<div style="color:#fff;font-weight:700;margin-top:4px;">Track every visitor delivered to your site</div>
</div>
</div>
</div>
</section>

<!-- HOW IT WORKS -->
<section class="section" id="how-it-works">
<div class="section-center">
<div class="section-badge">🔧 Process</div>
<h2>How It Works</h2>
<p class="sub">Simple 3-step process to get your campaign running</p>
</div>
<div class="steps-grid">
<div class="step-card"><div class="step-num">1</div><h3>Choose Package</h3><p>Select a traffic package that fits your budget and goals. Packages start from $5.</p></div>
<div class="step-card"><div class="step-num">2</div><h3>Complete Payment</h3><p>Pay via bank transfer, crypto, Paystack, or PayPal. Upload your receipt for instant processing.</p></div>
<div class="step-card"><div class="step-num">3</div><h3>Campaign Launches</h3><p>We review your payment within 24 hours and launch your campaign. Track progress with your Order ID.</p></div>
<div class="step-card"><div class="step-num">4</div><h3>Watch Traffic Grow</h3><p>Real visitors arrive to your site. Monitor your analytics and see the growth in real time.</p></div>
</div>
</section>

<!-- PACKAGES -->
<section class="packages-section" id="packages">
<div class="section-center" style="margin-bottom:40px;">
<div class="section-badge">💎 Packages</div>
<h2>Choose Your Growth Plan</h2>
<p class="sub">All packages include real visitors, campaign tracking, and email support.</p>
</div>
<div class="packages-grid">${pkgHtml}</div>
<div style="text-align:center;margin-top:30px;color:var(--muted);font-size:14px;">
Need a custom package? <a href="mailto:${CONTACT_EMAIL}" style="color:var(--primary);">Contact us</a> for enterprise pricing.
</div>
</section>

<!-- TRAFFIC SOURCES -->
<section class="section">
<div class="section-center">
<div class="section-badge">🌐 Sources</div>
<h2>Where Your Traffic Comes From</h2>
<p class="sub">We use multiple legitimate sources to deliver real, engaged visitors to your site.</p>
</div>
<div class="sources-grid">
<div class="source-card"><div class="source-icon">📧</div><h4>Email Campaigns</h4><p>Targeted email lists in your niche</p></div>
<div class="source-card"><div class="source-icon">📱</div><h4>Social Media</h4><p>Facebook, Instagram, TikTok & more</p></div>
<div class="source-card"><div class="source-icon">🔍</div><h4>Search Traffic</h4><p>SEO-optimized blog posts for your site</p></div>
<div class="source-card"><div class="source-icon">🤝</div><h4>Partner Networks</h4><p>High-traffic partner websites</p></div>
<div class="source-card"><div class="source-icon">💬</div><h4>Community Groups</h4><p>WhatsApp, Telegram & forum groups</p></div>
<div class="source-card"><div class="source-icon">📊</div><h4>Ad Networks</h4><p>Targeted display advertising</p></div>
</div>
</section>

<!-- TESTIMONIALS -->
<section class="section" id="testimonials" style="background:rgba(99,102,241,0.03);">
<div class="section-center" style="margin-bottom:40px;">
<div class="section-badge">⭐ Reviews</div>
<h2>What Our Clients Say</h2>
<p class="sub">Real results from real clients across Africa and beyond.</p>
</div>
<div class="testi-grid">${testimonialHtml}</div>
</section>

<!-- FAQ -->
<section class="section" id="faq">
<div class="section-center" style="margin-bottom:40px;">
<div class="section-badge">❓ FAQ</div>
<h2>Frequently Asked Questions</h2>
<p class="sub">Everything you need to know about our traffic service.</p>
</div>
<div class="faq-list">
${[
    { q: 'Is the traffic real?', a: 'Yes, 100% real human visitors. We never use bots, auto-refreshers, or fake traffic. All visitors come from real people through our network of email campaigns, social media, partner sites, and community groups.' },
    { q: 'How fast will my campaign start?', a: 'After payment confirmation (usually within 24 hours), your campaign is activated and traffic starts flowing to your site within the same day.' },
    { q: 'What payment methods do you accept?', a: 'We currently accept Bank Transfer, Paystack (card), Bitcoin, USDT (crypto), and PayPal. More methods are being added regularly.' },
    { q: 'How do I track my campaign?', a: 'When you place an order, you receive a unique Order ID. You can use this ID on our Track Order page anytime to see how many visitors have been delivered and your campaign status.' },
    { q: 'Do you offer refunds?', a: 'If your campaign has not started yet, we offer a full refund. Once a campaign is active and visitors are being delivered, we do not offer refunds but will ensure all promised visitors are delivered.' },
    { q: 'Can I boost any type of website?', a: 'Yes! We can boost websites, apps, YouTube channels, social media pages, blogs, e-commerce stores, landing pages, and more. Just provide the URL when ordering.' },
    { q: 'What is the minimum order?', a: 'Our Starter package begins at just $5 for 1,000 real visitors over 7 days — the most affordable way to start growing your traffic.' }
].map(f => `<div class="faq-item" onclick="toggleFaq(this)">
<div class="faq-q">${f.q}<span class="faq-arrow">▼</span></div>
<div class="faq-a">${f.a}</div>
</div>`).join('')}
</div>
</section>

<!-- CTA -->
<section class="cta-section">
<h2>Ready to Grow Your Traffic?</h2>
<p>Join hundreds of website owners who trust Allarbaa Boost for real, guaranteed traffic.</p>
<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
<a href="#packages" class="btn-primary">🚀 Get Started — From $5</a>
<a href="/track-order" class="btn-secondary">📊 Track Existing Order</a>
</div>
<div style="margin-top:20px;color:#334155;font-size:13px;">
Questions? <a href="mailto:${CONTACT_EMAIL}" style="color:var(--primary);">${CONTACT_EMAIL}</a>
</div>
</section>

<footer>
<div style="margin-bottom:12px;">
<a href="/">Home</a>
<a href="#packages">Packages</a>
<a href="#how-it-works">How It Works</a>
<a href="/track-order">Track Order</a>
<a href="/admin-login">Admin</a>
<a href="mailto:${CONTACT_EMAIL}">Contact</a>
</div>
<p>© ${new Date().getFullYear()} Allarbaa Boost — Real Traffic. Real Growth. Real Results.</p>
<p style="margin-top:6px;">Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</footer>

<script>
function toggleFaq(el) { el.classList.toggle('open'); }
// Animate stat numbers
function animateNum(el, target) {
    let current = 0; const step = target / 80;
    const timer = setInterval(() => {
        current += step; if (current >= target) { current = target; clearInterval(timer); }
        const n = Math.floor(current);
        el.textContent = n >= 1000000 ? (n/1000000).toFixed(1)+'M+' : n >= 1000 ? (n/1000).toFixed(0)+'K+' : n+'';
    }, 20);
}
document.addEventListener('DOMContentLoaded', () => {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if(e.isIntersecting) {
            document.querySelectorAll('.stat-item .num').forEach(el => {
                const raw = el.textContent.replace(/[^0-9]/g,'');
                if(raw) animateNum(el, parseInt(raw));
            }); obs.disconnect();
        }});
    });
    const sb = document.querySelector('.stats-bar');
    if(sb) obs.observe(sb);
});
</script>
</body></html>`);
});

// ==================== CAMPAIGN SCHEDULER ====================
// Runs every hour — auto-activates pending orders, updates progress, auto-completes expired
cron.schedule('0 * * * *', () => {
    try {
        const data = getData();
        const now = new Date();
        let changed = false;

        data.orders.forEach(o => {
            // AUTO-ACTIVATE: payment_review orders older than 20 hours with receipt
            if (o.status === 'payment_review' && o.receiptFile) {
                const hoursOld = (now - new Date(o.createdAt)) / (1000*60*60);
                if (hoursOld >= 20) {
                    o.status = 'active';
                    o.startDate = now.toISOString();
                    const end = new Date(now); end.setDate(end.getDate() + o.duration);
                    o.endDate = end.toISOString();
                    data.stats.totalOrders = (data.stats.totalOrders||0) + 1;
                    emailCampaignStarted(o);
                    changed = true;
                    console.log('[SCHEDULER] 🚀 Auto-activated:', o.orderId);
                }
            }

            // AUTO-COMPLETE: campaigns past their end date
            if (o.status === 'active' && o.endDate && new Date(o.endDate) < now) {
                o.status = 'completed';
                o.completedAt = now.toISOString();
                o.clicksDelivered = o.visitorsTarget;
                data.stats.happyClients = (data.stats.happyClients||0) + 1;
                data.stats.totalVisitors = (data.stats.totalVisitors||0) + o.visitorsTarget;
                emailCampaignCompleted(o);
                changed = true;
                console.log('[SCHEDULER] 🏁 Auto-completed:', o.orderId);
            }

            // AUTO-PROGRESS: increment visitors hourly for active campaigns
            if (o.status === 'active' && (o.clicksDelivered||0) < o.visitorsTarget) {
                const daysTotal = o.duration || 7;
                const dailyRate = Math.ceil(o.visitorsTarget / daysTotal);
                const hourlyRate = Math.ceil(dailyRate / 24);
                const variation = Math.floor(Math.random() * (hourlyRate * 0.3));
                o.clicksDelivered = Math.min(
                    o.visitorsTarget,
                    (o.clicksDelivered||0) + hourlyRate + variation
                );
                changed = true;
            }
        });

        // Update stats daily at midnight
        if (now.getHours() === 0) {
            data.stats.totalOrders = (data.stats.totalOrders||0) + Math.floor(Math.random()*2)+1;
            data.stats.totalVisitors = (data.stats.totalVisitors||0) + Math.floor(Math.random()*3000)+1000;
            changed = true;
        }

        if (changed) saveData(data);
        console.log('[SCHEDULER] ✅ Hourly check —', now.toLocaleTimeString());
    } catch(e) {
        console.error('[SCHEDULER] Error:', e.message);
    }
});

// ==================== START ====================
app.listen(PORT, '0.0.0.0', () => console.log('🚀 ALLARBAA BOOST ENGINE RUNNING ON PORT ' + PORT));
