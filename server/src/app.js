require('dotenv').config(); 
const path = require('path');
const express = require('express'); 
const cors = require('cors'); 
const pool = require('../config/database');
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const tableRoutes = require('./routes/table.routes');
const orderRoutes = require('./routes/order.routes');
const waiterRoutes= require('./routes/waiter.routes');
const { error } = require('console');
const app = express(); 
app.use(cors()); 
app.use(express.json()); 
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/waiter', waiterRoutes);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
app.use((err,req,res,next)=>{
    res.status(400).json({error: err.message})
})

    pool.query('SELECT NOW()') 
    .then(res => console.log('Veritabanı bağlantısı başarılı:', res.rows[0])) 
    .catch(err => console.error('Veritabanı bağlantı hatası:', err)); 
    const PORT = process.env.PORT || 3000; app.listen(PORT, () => 
        { 
            console.log(`Sunucu ${PORT} portunda çalışıyor`); 
        })
