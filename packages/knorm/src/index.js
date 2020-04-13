const Knorm = require('./Knorm');
const knorm = (config) => new Knorm(config);

knorm.Knorm = Knorm;

module.exports = knorm;
