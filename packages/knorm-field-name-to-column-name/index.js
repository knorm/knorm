const KnormVirtuals = require('./lib/KnormVirtuals');
const knormVirtuals = config => new KnormVirtuals(config);

knormVirtuals.KnormVirtuals = KnormVirtuals;

module.exports = knormVirtuals;
