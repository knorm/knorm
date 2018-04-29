const KnormPostgres = require('./lib/KnormPostgres');
const knormPostgres = config => new KnormPostgres(config);

knormPostgres.KnormPostgres = KnormPostgres;

module.exports = knormPostgres;
