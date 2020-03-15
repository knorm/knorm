const KnormSoftDelete = require('./KnormSoftDelete');
const knormSoftDelete = config => new KnormSoftDelete(config);

knormSoftDelete.KnormSoftDelete = KnormSoftDelete;

module.exports = knormSoftDelete;
