const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/itens', require('./itens.routes'));
router.use('/eventos', require('./eventos.routes'));
router.use('/setores', require('./setores.routes'));
router.use('/usuarios', require('./usuarios.routes'));
router.use('/lotes', require('./lotes.routes'));

module.exports = router;
