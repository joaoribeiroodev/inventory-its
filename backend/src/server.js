require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`inventory-its API rodando na porta ${PORT}`);
});
