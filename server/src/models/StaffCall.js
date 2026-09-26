const pool= require('../../config/database')

async function createCall({restaurant_id, table_id, call_type}) {
    const result= await pool.query(
        'INSERT INTO staff_calls (restaurant_id, table_id, call_type) VALUES ($1, $2, $3) RETURNING *',
    [restaurant_id, table_id, call_type]);

    return result.rows[0]
}

async function resolveCall(id) {

    const result= await pool.query('UPDATE staff_calls SET is_resolved=true, resolved_at=now() WHERE id=$1 RETURNING *',
    [id]);

    return result.rows[0]   
}

async function activeCalls() {
    const result= await pool.query('SELECT * FROM staff_calls WHERE is_resolved=false')
    return result.rows
}

module.exports={createCall, resolveCall,  activeCalls}