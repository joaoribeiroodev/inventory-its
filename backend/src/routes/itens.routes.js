const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');
const itens = require('../controllers/itens.controller');

const router = Router();

router.use(autenticar);

router.get('/sync', itens.sync);
router.get('/exportar/xlsx', itens.exportarXlsx);
router.get('/', itens.listar);
router.get('/codigo/:codigo', itens.buscarPorCodigo);
router.get('/:id', itens.buscarPorId);
router.get('/:id/eventos', itens.listarHistorico);
router.get('/:id/csv', itens.exportarCsv);

router.post('/', autorizar('admin', 'cadastrador'), itens.criar);
router.put('/:id', autorizar('admin', 'cadastrador'), itens.atualizar);
router.post('/:id/movimentar', itens.registrarMovimentacao);
// Exclusão é restrita a admin — ação destrutiva e irreversível
// (apaga também o histórico de movimentação do item, em cascata).
router.delete('/:id', autorizar('admin'), itens.excluir);

module.exports = router;
