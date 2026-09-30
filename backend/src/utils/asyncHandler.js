// Envolve um controller async e encaminha qualquer erro pro
// errorHandler, sem precisar de try/catch repetido em cada rota.
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { asyncHandler };
