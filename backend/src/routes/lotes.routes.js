const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');
const lotes = require('../controllers/lotes.controller');

const router = Router();

router.use(autenticar);
router.use(autorizar('admin', 'cadastrador')); // geração de etiqueta é tarefa administrativa

router.get('/pendentes', lotes.listarPendentes);
router.get('/', lotes.listar);
router.post('/', lotes.criar);
router.get('/:id/csv', lotes.exportarCsv);

module.exports = router;
