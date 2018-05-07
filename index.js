const KnormTimestamps = require('./lib/KnormTimestamps');
const knormTimestamps = config => new KnormTimestamps(config);

knormTimestamps.KnormTimestamps = KnormTimestamps;

module.exports = knormTimestamps;
