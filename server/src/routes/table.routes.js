const express= require('express');
const router= express.Router();
const tableController =require('../controllers/tableController');
const verifyToken =require('../middlewares/auth.middleware');

router.post('/tables/:id/start-session',verifyToken, tableController.startSession)
router.get('/tables', tableController.getTables);
router.post('/tables', verifyToken, tableController.createTable);

module.exports= router;