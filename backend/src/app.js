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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
