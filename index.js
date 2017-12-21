const makeKnorm = options => new Knorm(options);

module.exports = makeKnorm;

// avoid circular deps
const Knorm = require('./lib/Knorm');
const addExports = require('./lib/addExports');

addExports(makeKnorm);
