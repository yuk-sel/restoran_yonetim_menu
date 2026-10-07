const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function register(req, res) {
  try {
    const { restaurant_id, role, full_name, email, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.createUser({
      restaurant_id,
      role,
      full_name,
      email,
      password_hash
    });

    res.status(201).json(user);
  } 
  catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, restaurant_id: user.restaurant_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, role: user.role, restaurant_id: user.restaurant_id }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login };