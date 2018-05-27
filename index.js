const Knorm = require('./lib/Knorm');
const knorm = config => new Knorm(config);

knorm.Knorm = Knorm;

module.exports = knorm;
