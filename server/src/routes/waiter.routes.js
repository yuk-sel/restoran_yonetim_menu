const express= require('express')
const router= express.Router()
const waiterController= require('../controllers/waiterController')
const verifyToken = require('../middlewares/auth.middleware');

router.post('/waiter-call', verifyToken, waiterController.callWaiter);
router.post('/request-bill', verifyToken, waiterController.requestBill);
router.get('/active-calls', waiterController.getActiveCalls);
router.patch('/calls/:id/resolve', verifyToken, waiterController.resolveStaffCall);

module.exports= router