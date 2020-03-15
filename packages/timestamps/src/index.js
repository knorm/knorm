const KnormTimestamps = require('./KnormTimestamps');
const knormTimestamps = config => new KnormTimestamps(config);

knormTimestamps.KnormTimestamps = KnormTimestamps;

module.exports = knormTimestamps;
