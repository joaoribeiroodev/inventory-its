const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');
const usuarios = require('../controllers/usuarios.controller');

const router = Router();

router.use(autenticar);
router.use(autorizar('admin')); // toda a gestão de usuários é restrita a admin

router.get('/', usuarios.listar);
router.post('/', usuarios.criar);
router.put('/:id', usuarios.atualizar);

module.exports = router;
