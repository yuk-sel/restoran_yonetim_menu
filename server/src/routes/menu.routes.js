const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const verifyToken = require('../middlewares/auth.middleware');

router.get('/categories/:category_id/products', menuController.getProductsByCategory);
router.get('/categories', menuController.getCategories);
router.post('/categories',verifyToken, menuController.createCategory);
router.post('/products', verifyToken, menuController.createProduct);
router.patch('/products/:id/status', verifyToken, menuController.updateProductStatus);
router.get('/products', menuController.getAllProducts);

module.exports = router;