const KnormPaginate = require('./lib/KnormPaginate');
const knormPaginate = config => new KnormPaginate(config);

knormPaginate.KnormPaginate = KnormPaginate;

module.exports = knormPaginate;
