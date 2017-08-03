const { Model: KnormModel, Query: KnormQuery } = require('knorm');
const expect = require('unexpected').clone();
const withTimestamps = require('../');

describe('withTimestamps', () => {
  it('returns a knorm query class if passed a knorm query subclass', () => {
    class Foo extends KnormQuery {}
    expect(withTimestamps(Foo).prototype, 'to be a', KnormQuery);
  });

  it("returns a knorm query class if passed a knorm's query class", () => {
    expect(withTimestamps(KnormQuery).prototype, 'to be a', KnormQuery);
  });

  it('returns a knorm model class if passed a knorm model subclass', () => {
    class Foo extends KnormModel {}
    expect(withTimestamps(Foo).prototype, 'to be a', KnormModel);
  });

  it("returns a knorm model class if passed a knorm's model class", () => {
    expect(withTimestamps(KnormModel).prototype, 'to be a', KnormModel);
  });

  it('throws if passed anything else', () => {
    class Foo {}
    expect(
      () => withTimestamps(Foo),
      'to throw',
      new Error('base class is neither a knorm model nor knorm query class')
    );
  });
});
