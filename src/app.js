const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/management/comics', require('./routes/managementComics'));
app.use('/api/admin/orders', require('./routes/adminOrders'));
app.use('/api/comics/:comicId/reviews', require('./routes/reviews'));
app.use('/api/comics', require('./routes/comics'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Rutas de IA
const aiRateLimit = require('./middleware/aiRateLimit');
app.use('/api/chat', aiRateLimit, require('./routes/chatRouter'));
app.use('/api/recommendations', aiRateLimit, require('./routes/recommendRouter'));
app.use('/api/generate-description', aiRateLimit, require('./routes/descriptionRouter'));

app.get('/', (req, res) => res.json({ message: 'Comic eCommerce API running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
