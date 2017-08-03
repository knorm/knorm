const modelWithTimestamps = require('./lib/modelWithTimestamps');
const queryWithTimestamps = require('./lib/queryWithTimestamps');
const { Model: KnormModel, Query: KnormQuery } = require('knorm');

module.exports = (Base, config) => {
  if (Base.prototype instanceof KnormModel || Base === KnormModel) {
    return modelWithTimestamps(Base, config);
  }
  if (Base.prototype instanceof KnormQuery || Base === KnormQuery) {
    return queryWithTimestamps(Base);
  }
  throw new Error('base class is neither a knorm model nor knorm query class');
};
