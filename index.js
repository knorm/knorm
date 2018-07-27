const KnormToJSON = require('./lib/KnormToJSON');
const knormToJSON = config => new KnormToJSON(config);

knormToJSON.KnormToJSON = KnormToJSON;

module.exports = knormToJSON;
