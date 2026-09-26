const express= require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken =require('../middlewares/auth.middleware');

router.post('/orders', verifyToken, orderController.createOrder);
router.get('/orders', orderController.getOrders)
router.patch('/orders/:id/status', verifyToken, orderController.updateOrderStatus)

module.exports= router;