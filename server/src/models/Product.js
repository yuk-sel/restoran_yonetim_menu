const pool = require('../../config/database')

async function findByCategory(category_id) {
    const result= await pool.query('SELECT * FROM products WHERE category_id =$1', [category_id]);
    return result.rows
    
}

async function create({category_id, name, description, price}) {
    const result= await pool.query(
        'INSERT INTO products (category_id, name, description, price) VALUES ($1, $2, $3, $4) RETURNING *',
        [category_id, name, description, price]
    )
    return result.rows[0]
    
}

async function findById(id) {
    const result= await pool.query('SELECT * FROM products WHERE id =$1', [id]);
    return result.rows[0]
}

async function updateStatus(id, status) {
    const result= await pool.query(
        'UPDATE products SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    return result.rows[0]
}

async function findAll() {
    const result= await pool.query('SELECT * FROM products');
    return result.rows
}

module.exports={findByCategory, create, findById, updateStatus, findAll}