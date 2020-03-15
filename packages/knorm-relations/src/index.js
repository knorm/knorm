const KnormRelations = require('./KnormRelations');
const knormRelations = config => new KnormRelations(config);

knormRelations.KnormRelations = KnormRelations;

module.exports = knormRelations;
