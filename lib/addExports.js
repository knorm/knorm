const addExports = object => {
  object.Knorm = require('./Knorm');
  object.Model = require('./Model');
  object.Query = require('./Query');
  object.Field = require('./Field');
  object.Transaction = require('./Transaction');
  object.KnormError = require('./KnormError');
  object.QueryError = require('./QueryError');
  object.ValidationError = require('./ValidationError');

  return object;
};

module.exports = addExports;
