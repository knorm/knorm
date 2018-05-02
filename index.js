const KnormRelations = require('./lib/KnormRelations');
const knormRelations = config => new KnormRelations(config);

knormRelations.KnormRelations = KnormRelations;

module.exports = knormRelations;
