const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');
const setores = require('../controllers/setores.controller');

const router = Router();

router.use(autenticar);

router.get('/', setores.listar);
router.post('/', autorizar('admin', 'cadastrador'), setores.criar);
router.put('/:id', autorizar('admin', 'cadastrador'), setores.atualizar);
router.delete('/:id', autorizar('admin'), setores.excluir);

module.exports = router;
