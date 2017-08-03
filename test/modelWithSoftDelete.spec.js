const { Model: KnormModel } = require('knorm');
const expect = require('unexpected').clone();
const modelWithSoftDelete = require('../lib/modelWithSoftDelete');

describe('modelWithSoftDelete', () => {
  it('throws an error if not passed a knorm model subclass', () => {
    class Foo {}
    expect(
      () => modelWithSoftDelete(Foo),
      'to throw',
      new Error('base class is not a knorm model class')
    );
  });

  it("accepts knorm's model class as the base class", () => {
    expect(() => modelWithSoftDelete(KnormModel), 'not to throw');
  });

  it('returns a knorm model subclass', () => {
    class Foo extends KnormModel {}
    const Bar = modelWithSoftDelete(Foo);
    expect(Bar.prototype, 'to be a', KnormModel);
  });

  describe('with a `deleted` config', () => {
    class Foo extends KnormModel {}

    it('adds a `deleted` field', () => {
      const Bar = modelWithSoftDelete(Foo, { deleted: true });
      expect(Bar.fields, 'to satisfy', {
        deleted: {
          type: 'boolean',
          column: 'deleted'
        }
      });
      expect(Bar.fieldNames, 'to satisfy', {
        deleted: 'deleted'
      });
    });

    it('allows configuring the `deleted` field-name', () => {
      const Bar = modelWithSoftDelete(Foo, { deleted: { name: 'isDeleted' } });
      expect(Bar.fields, 'to satisfy', {
        deleted: undefined,
        isDeleted: {
          type: 'boolean'
        }
      });
      expect(Bar.fieldNames, 'to satisfy', {
        deleted: 'isDeleted'
      });
    });

    it('allows configuring the `deleted` field column-name', () => {
      const Bar = modelWithSoftDelete(Foo, {
        deleted: { column: 'is_deleted' }
      });
      expect(Bar.fields, 'to satisfy', {
        deleted: {
          column: 'is_deleted'
        }
      });
    });
  });

  describe('with a `deletedAt` config', () => {
    class Foo extends KnormModel {}

    it('adds a `deletedAt` field', () => {
      const Bar = modelWithSoftDelete(Foo, { deletedAt: true });
      expect(Bar.fields, 'to satisfy', {
        deletedAt: {
          type: 'dateTime',
          column: 'deleted_at'
        }
      });
      expect(Bar.fieldNames, 'to satisfy', {
        deletedAt: 'deletedAt'
      });
    });

    it('allows configuring the `deletedAt` field-name', () => {
      const Bar = modelWithSoftDelete(Foo, { deletedAt: { name: 'deleted' } });
      expect(Bar.fields, 'to satisfy', {
        deletedAt: undefined,
        deleted: {
          type: 'dateTime'
        }
      });
      expect(Bar.fieldNames, 'to satisfy', {
        deletedAt: 'deleted'
      });
    });

    it('allows configuring the `deletedAt` field column-name', () => {
      const Bar = modelWithSoftDelete(Foo, {
        deletedAt: { column: 'deleted' }
      });
      expect(Bar.fields, 'to satisfy', {
        deletedAt: {
          column: 'deleted'
        }
      });
    });
  });
});
