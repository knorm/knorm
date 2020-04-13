const KnormToJSON = require('./KnormToJSON');
const knormToJSON = (config) => new KnormToJSON(config);

knormToJSON.KnormToJSON = KnormToJSON;

module.exports = knormToJSON;
