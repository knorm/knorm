module.exports = (Base, config) => {
  const modelWithSoftDelete = require('./lib/modelWithSoftDelete');
  const queryWithSoftDelete = require('./lib/queryWithSoftDelete');
  const { Model: KnormModel, Query: KnormQuery } = require('knorm');

  if (Base.prototype instanceof KnormModel || Base === KnormModel) {
    return modelWithSoftDelete(Base, config);
  }
  if (Base.prototype instanceof KnormQuery || Base === KnormQuery) {
    return queryWithSoftDelete(Base);
  }
  throw new Error('base class is neither a knorm model nor knorm query class');
};
