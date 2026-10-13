const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const verifyToken = require('../middlewares/auth.middleware');

const multer= require('multer')
const path= require('path')

const storage= multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb)=>{
        const uzanti= path.extname(file.originalname)
        cb(null, Date.now()+ uzanti)
    }
})

const upload= multer({
    storage,
    limits: {fileSize: 5*1024*1024},
    fileFilter: (req, file, cb)=>{
        if (file.mimetype.startsWith("image/")){
            cb(null, true)
        }
        else{
            cb(new Error("Sadece resim dosyaları yüklenebilir."))
        }
    }
})

router.get('/categories/:category_id/products', menuController.getProductsByCategory);
router.get('/categories', menuController.getCategories);
router.post('/categories',verifyToken, menuController.createCategory);
router.post('/products', verifyToken, upload.single("image_url"), menuController.createProduct);
router.patch('/products/:id/status', verifyToken, menuController.updateProductStatus);
router.get('/products', menuController.getAllProducts);
router.delete('/products/:id', verifyToken, menuController.deleteProduct);
router.patch('/products/:id', verifyToken, upload.single("image_url"), menuController.updateProduct)

module.exports = router;