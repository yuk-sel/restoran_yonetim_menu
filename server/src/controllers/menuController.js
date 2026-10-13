const Category= require('../models/Category')
const Product = require('../models/Product')

async function getCategories(req, res) {
    try{
        const categories= await Category.findAll();
        res.json(categories);
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}

async function createCategory(req, res) {
    try{
        const{restaurant_id, name} =req.body;
        const category= await Category.create({restaurant_id, name});
        res.status(201).json(category);
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}

async function getProductsByCategory(req, res) {
    try{
        const category_id = req.params.category_id;
        const products= await Product.findByCategory(category_id);
        res.json(products);
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
  
}

async function createProduct(req, res) {

    console.log("FILE:", req.file)
    console.log("body:", req.body)
    try{
        console.log("FILE1:", req.file)
        console.log("body1:", req.body)
        const{category_id, name, description, price}= req.body;
        let image_url
        if(req .file){
            image_url= `/uploads/${req.file.filename}`
        }
        else{
            image_url=null
        }
        const products =await Product.create({category_id, name, description, price, image_url});
        res.status(201).json(products)
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}

async function updateProductStatus(req, res) {
    try{
        const productId = req.params.id;
        const { status } = req.body;
        const updatedProduct = await Product.updateStatus(productId, status);
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }
        res.json(updatedProduct);
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
}
async function getAllProducts(req, res) {
    try{
        const products = await Product.findAll();
        res.json(products);
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
}

async function deleteProduct(req, res) {

    try{
        const productID= req.params.id
        const products= await Product.deleteProduct(productID)
        res.json(products)
    }
    catch(err){
        res.status(404).json({error: err.message})
    }
    
}

async function updateProduct(req, res) {

    try{
        const productID= req.params.id
        const{name, description, price}= req.body
        let image_url=null
        if(req.file){
            image_url= `/uploads/${req.file.filename}`
        }
        const product= await Product.updateProduct({productID, name,description, price, image_url})
        res.json(product)
    }
    catch(err){
        res.status(404).json({error: err.message})
    }
    
}

module.exports= {getCategories, createCategory, getProductsByCategory, createProduct, updateProductStatus, getAllProducts, deleteProduct, updateProduct};