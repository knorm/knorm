const KnormVirtuals = require('./KnormVirtuals');
const knormVirtuals = config => new KnormVirtuals(config);

knormVirtuals.KnormVirtuals = KnormVirtuals;

module.exports = knormVirtuals;
