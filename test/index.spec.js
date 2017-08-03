const { Model: KnormModel, Query: KnormQuery } = require('knorm');
const expect = require('unexpected').clone();
const withSoftDelete = require('../');

describe('withSoftDelete', () => {
  it('returns a knorm query class if passed a knorm query subclass', () => {
    class Foo extends KnormQuery {}
    expect(withSoftDelete(Foo).prototype, 'to be a', KnormQuery);
  });

  it("returns a knorm query class if passed a knorm's query class", () => {
    expect(withSoftDelete(KnormQuery).prototype, 'to be a', KnormQuery);
  });

  it('returns a knorm model class if passed a knorm model subclass', () => {
    class Foo extends KnormModel {}
    expect(withSoftDelete(Foo).prototype, 'to be a', KnormModel);
  });

  it("returns a knorm model class if passed a knorm's model class", () => {
    expect(withSoftDelete(KnormModel).prototype, 'to be a', KnormModel);
  });

  it('throws if passed anything else', () => {
    class Foo {}
    expect(
      () => withSoftDelete(Foo),
      'to throw',
      new Error('base class is neither a knorm model nor knorm query class')
    );
  });
});
