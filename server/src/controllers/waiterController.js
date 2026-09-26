const StaffCalls = require('../models/StaffCall')

async function callWaiter(req, res) {
    try{
        const{restaurant_id, table_id}=req.body;
        const call= await StaffCalls.createCall({restaurant_id, table_id, call_type: 'CALL_WAITER'});
        res.status(201).json(call);

    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}

async function requestBill(req, res) {
    try{
        const{restaurant_id, table_id}=req.body;
        const call= await StaffCalls.createCall({restaurant_id, table_id, call_type: 'REQUEST_BILL'});
        res.status(201).json(call);

    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}

async function getActiveCalls(req, res) {
    try{
        const calls= await StaffCalls.activeCalls();
        res.status(200).json(calls)
    }
    catch(err){
        res.status(500).json({error: err.message})
    }  
}

async function resolveStaffCall(req, res) {
    try{
        const id= req.params.id;
        const call= await StaffCalls.resolveCall(id);
        res.status(200).json(call)
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}
module.exports={callWaiter, requestBill, getActiveCalls, resolveStaffCall}
