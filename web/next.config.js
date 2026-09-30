/** @type {import('next').NextConfig} */
const nextConfig = {
    // "standalone" gera um build enxuto, pensado para rodar em
    // container Docker sem precisar do node_modules inteiro copiado
    // à mão (ver Dockerfile deste diretório).
    output: 'standalone',
};

module.exports = nextConfig;
