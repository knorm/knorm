const KnormPostgres = require('./lib/KnormPostgres');

module.exports = config => new KnormPostgres(config);
