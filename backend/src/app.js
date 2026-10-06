// BigInt não é serializável por padrão pelo JSON.stringify.
// Como IDs no MySQL/Prisma são BigInt, convertemos globalmente
// para string na resposta (evita ter que fazer isso item a item
// em cada controller).
BigInt.prototype.toJSON = function () {
    return this.toString();
};

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// O painel web e o app mobile mandam esse header em toda chamada
// (ver services/api.js dos dois) pra identificar de onde veio a
// requisição — usado só para rotular os eventos gravados no log do
// sistema (ver utils/logger.js), nunca pra lógica de negócio.
// 'backend' cobre o caso de algo gerado pelo próprio servidor (ex:
// seed, scripts) sem passar por essa camada HTTP.
app.use((req, res, next) => {
    const origem = req.headers['x-origem-cliente'];
    req.origemCliente = origem === 'web' || origem === 'app' ? origem : 'backend';
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
