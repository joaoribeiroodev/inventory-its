const { Router } = require('express');
const { autenticar } = require('../middlewares/auth');
const { sincronizar } = require('../controllers/eventos.controller');

const router = Router();

router.use(autenticar);

router.post('/sync', sincronizar);

module.exports = router;
