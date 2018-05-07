const KnormSoftDelete = require('./lib/KnormSoftDelete');
const knormSoftDelete = config => new KnormSoftDelete(config);

knormSoftDelete.KnormSoftDelete = KnormSoftDelete;

module.exports = knormSoftDelete;
