const { Router } = require('express');
const { autenticarOpcional, autenticar, autorizar } = require('../middlewares/auth');
const logs = require('../controllers/logs.controller');

const router = Router();

// POST não exige login (autenticarOpcional) — ver comentário no
// controller: um erro pode acontecer antes do login ser concluído.
router.post('/', autenticarOpcional, logs.registrarLogCliente);

// Consultar o histórico é restrito a admin (tela de Monitoramento).
router.get('/', autenticar, autorizar('admin'), logs.listar);
router.get('/resumo', autenticar, autorizar('admin'), logs.resumo);

module.exports = router;
