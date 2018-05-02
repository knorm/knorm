const { snakeCase: fieldToColumn } = require('lodash');
const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres');
const KnormRelations = require('../lib/KnormRelations');
const knormRelations = require('../');
const knex = require('./lib/knex');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-knex'))
  .addAssertion(
    '<Promise> to be fulfilled with sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const ascendingOrder = (a, b) => parseInt(a.id) - parseInt(b.id);
      expect.errorMode = 'bubble';
      return expect(
        subject,
        'to be fulfilled with value satisfying',
        subject => {
          expect(subject, 'to be an array');
          expect(
            subject,
            'sorted by',
            ascendingOrder,
            'to [exhaustively] satisfy',
            value
          );
        }
      );
    }
  )
  .addAssertion(
    '<knexQuery> to have sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const ascendingOrder = (a, b) => parseInt(a.id) - parseInt(b.id);
      expect.errorMode = 'bubble';
      return expect(subject, 'to have rows satisfying', rows =>
        expect(
          rows,
          'sorted by',
          ascendingOrder,
          'to [exhaustively] satisfy',
          value
        )
      );
    }
  );

const { KnormRelationsError } = KnormRelations;

describe('KnormRelations', () => {
  const orm = knorm({ fieldToColumn })
    .use(knormPostgres({ connection: knex.client.config.connection }))
    .use(knormRelations());

  const Query = orm.Query;

  class Model extends orm.Model {}
  Model.fields = {
    id: { type: 'integer', primary: true, updated: false }
  };

  class User extends Model {}
  User.table = 'user';
  User.fields = {
    name: { type: 'string', required: true },
    confirmed: 'boolean'
  };

  class ImageCategory extends Model {}
  ImageCategory.table = 'image_category';
  ImageCategory.fields = { name: { type: 'string', required: true } };

  class Image extends Model {}
  Image.table = 'image';
  Image.fields = {
    userId: { type: 'integer', references: User.fields.id },
    categoryId: { type: 'integer', references: ImageCategory.fields.id }
  };

  class Message extends Model {}
  Message.table = 'message';
  Message.fields = {
    text: { type: 'text', required: true },
    senderId: { type: 'integer', references: User.fields.id },
    receiverId: { type: 'integer', references: User.fields.id }
  };

  before(async () => {
    await knex.schema.createTable(User.table, table => {
      table.increments();
      table.string('name');
      table.boolean('confirmed');
    });
    await knex.schema.createTable(ImageCategory.table, table => {
      table.increments();
      table.string('name').notNullable();
    });
    await knex.schema.createTable(Image.table, table => {
      table.increments();
      table
        .integer('user_id')
        .references('id')
        .inTable(User.table);
      table
        .integer('category_id')
        .references('id')
        .inTable(ImageCategory.table);
    });
    await knex.schema.createTable(Message.table, table => {
      table.increments();
      table.timestamps();
      table.text('text').notNullable();
      table
        .integer('sender_id')
        .references('id')
        .inTable(User.table);
      table
        .integer('receiver_id')
        .references('id')
        .inTable(User.table);
    });

    await User.insert([
      { id: 1, name: 'User 1', confirmed: null },
      { id: 2, name: 'User 2', confirmed: true }
    ]);
    await ImageCategory.insert([{ id: 1, name: 'User images' }]);
    await Image.insert([{ id: 1, userId: 1, categoryId: 1 }]);
    await Message.insert([
      { id: 1, text: 'Hi User 2', senderId: 1, receiverId: 2 },
      { id: 2, text: 'Hi User 1', senderId: 2, receiverId: 1 }
    ]);
  });

  after(async () => {
    await knex.schema.dropTable(Message.table);
    await knex.schema.dropTable(Image.table);
    await knex.schema.dropTable(ImageCategory.table);
    await knex.schema.dropTable(User.table);
  });

  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormRelations().init(),
        'to throw',
        new KnormRelationsError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormRelations().init({}),
        'to throw',
        new KnormRelationsError('invalid Knorm instance provided')
      );
    });
  });

  describe('updateModel', function() {
    describe('enables `Model.config.references`', function() {
      it("returns the model's references", function() {
        class Foo extends Model {}
        class Bar extends Model {}

        Foo.fields = { id: { type: 'integer' } };
        Bar.fields = { fooId: { type: 'integer', references: Foo.fields.id } };

        expect(Bar.config.references, 'to exhaustively satisfy', {
          Foo: { fooId: Bar.fields.fooId }
        });
      });

      describe('when a model is subclassed', function() {
        let Foo;

        before(function() {
          Foo = class extends Model {};
          Foo.fields = { id: { type: 'integer' }, id2: { type: 'integer' } };
        });

        it('overwrites references defined in the parent', function() {
          class Bar extends Model {}
          class Quux extends Bar {}

          Bar.fields = {
            fooId: { type: 'integer', references: Foo.fields.id }
          };
          Quux.fields = {
            fooId: { type: 'integer', references: Foo.fields.id2 }
          };

          expect(Model.config.references, 'to exhaustively satisfy', {});
          expect(Bar.config.references, 'to exhaustively satisfy', {
            Foo: { fooId: Bar.fields.fooId }
          });
          expect(Quux.config.references, 'to exhaustively satisfy', {
            Foo: { fooId: Quux.fields.fooId }
          });
        });

        it("inherits but does not interfere with the parent's references", function() {
          class Bar extends Model {}
          class Quux extends Bar {}

          Bar.fields = {
            fooId: { type: 'integer', references: Foo.fields.id }
          };
          Quux.fields = {
            fooId2: { type: 'integer', references: Foo.fields.id2 }
          };

          expect(Model.config.references, 'to exhaustively satisfy', {});
          expect(Bar.config.references, 'to exhaustively satisfy', {
            Foo: { fooId: Bar.fields.fooId }
          });
          expect(Quux.config.references, 'to exhaustively satisfy', {
            Foo: { fooId: Quux.fields.fooId, fooId2: Quux.fields.fooId2 }
          });
        });
      });
    });
  });

  describe('updateQuery', () => {
    describe('Query.prototype.fetch', () => {
      describe('with no joins configured', () => {
        it('fetches and populates all instance fields', async () => {
          const query = new Query(User);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({ id: 1, name: 'User 1', confirmed: null }),
              new User({ id: 2, name: 'User 2', confirmed: true })
            ]
          );
        });
      });

      describe("with 'distinct' configured", () => {
        it('supports `leftJoin`', async () => {
          await expect(
            new Query(User)
              .distinct(['name'])
              .leftJoin(Image)
              .fetch(),
            'to be fulfilled with value satisfying',
            rows =>
              expect(
                rows,
                'when sorted by',
                (a, b) => (a.name > b.name ? 1 : -1),
                'to exhaustively satisfy',
                [
                  new User({
                    name: 'User 1',
                    image: [new Image({ id: 1, userId: 1, categoryId: 1 })]
                  }),
                  new User({ name: 'User 2' })
                ]
              )
          );
        });

        it('supports `innerJoin`', async () => {
          await Image.insert({ id: 2, userId: 1, categoryId: 1 });

          await expect(
            new Query(User)
              .distinct(['id', 'name'])
              .innerJoin(Image)
              .fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );

          await Image.delete({ where: { id: 2 } });
        });
      });

      describe("with a 'leftJoin' configured", () => {
        it('throws an error if the models do not reference each other', () => {
          class Foo extends Model {}
          Foo.table = 'foo';
          expect(
            () => new Query(User).leftJoin(new Query(Foo)),
            'to throw',
            new Error("'User' has no references to 'Foo'")
          );
          expect(
            () => new Query(Foo).leftJoin(new Query(User)),
            'to throw',
            new Error("'Foo' has no references to 'User'")
          );
        });

        it('includes the joined models for every instance', async () => {
          const query = new Query(User).leftJoin(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                image: [new Image({ id: 1 })]
              }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('populates all instance fields', async () => {
          const query = new Query(User).leftJoin(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                confirmed: null,
                image: [new Image({ id: 1, userId: 1, categoryId: 1 })]
              }),
              new User({
                id: 2,
                name: 'User 2',
                confirmed: true
              })
            ]
          );
        });

        it('does not include the joined model if no rows were matched', async () => {
          const query = new Query(User)
            .leftJoin(new Query(Image))
            .where({ id: 2 });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('includes all joined models if more than one rows are matched', async () => {
          await Image.insert({ id: 2, userId: 1, categoryId: 1 });

          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                image: [new Image({ id: 1 }), new Image({ id: 2 })]
              })
            ]
          );

          await Image.delete({ where: { id: 2 } });
        });

        describe("with 'fields' configured on the joined query", () => {
          it('returns only the requested fields from the joined model', async () => {
            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image).fields('id'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [
                    expect.it('to exhaustively satisfy', new Image({ id: 1 }))
                  ]
                })
              ]
            );
          });

          it('returns all the fields from the parent model', async () => {
            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image).fields('id'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 1 })]
                })
              ]
            );
          });

          it('allows specifying separate fields on the parent model', async () => {
            const query = new Query(User)
              .where({ id: 1 })
              .fields(['id', 'name'])
              .leftJoin(new Query(Image).fields('id'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 1 })]
                })
              ]
            );
          });
        });

        describe("with 'as' configured on the joined query", () => {
          it('uses the passed string as the property name of the joined model', async () => {
            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image).as('images'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  images: [new Image({ id: 1 })]
                })
              ]
            );
          });
        });

        describe("with 'first' configured on the joined query", () => {
          it('returns the first joined model', async () => {
            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image).first());
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [new User({ id: 1, name: 'User 1', image: new Image({ id: 1 }) })]
            );
          });
        });

        it('creates a left join to the model on all fields wih references', async () => {
          const query = new Query(User).leftJoin(
            new Query(Message).as('messages')
          );
          // this query doesn't match any messages since it joins
          // ON user.id = message.sender_id AND user.id = message.receiver_id
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [{ messages: undefined }, { messages: undefined }]
          );
        });

        describe("with 'on' configured on the joined query", () => {
          it('creates a join on the provided field', async () => {
            const query = new Query(User).leftJoin([
              new Query(Message).on('senderId').as('sentMessages'),
              new Query(Message).on('receiverId').as('receivedMessages')
            ]);
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  sentMessages: [
                    new Message({
                      id: 1,
                      text: 'Hi User 2',
                      senderId: 1,
                      receiverId: 2
                    })
                  ],
                  receivedMessages: [
                    new Message({
                      id: 2,
                      text: 'Hi User 1',
                      senderId: 2,
                      receiverId: 1
                    })
                  ]
                }),
                new User({
                  id: 2,
                  name: 'User 2',
                  sentMessages: [
                    new Message({
                      id: 2,
                      text: 'Hi User 1',
                      senderId: 2,
                      receiverId: 1
                    })
                  ],
                  receivedMessages: [
                    new Message({
                      id: 1,
                      text: 'Hi User 2',
                      senderId: 1,
                      receiverId: 2
                    })
                  ]
                })
              ]
            );
          });
        });

        describe("with 'where' configured on the joined query", () => {
          it('fulfils the requested query on the joined model', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const query = new Query(User).leftJoin(
              new Query(Image).where({ id: 2 })
            );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 2 })]
                })
              ]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        describe("with 'where not' configured on the joined query", () => {
          it('fulfils the requested query on the joined model', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const where = new Query.Where();
            const query = new Query(User).leftJoin(
              new Query(Image).where(where.not({ id: 2 }))
            );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 1 })]
                })
              ]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        describe("with 'where or' configured on the joined query", () => {
          it('fulfils the requested query on the joined model', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const where = new Query.Where();
            const query = new Query(User).leftJoin(
              new Query(Image).where(where.or({ id: 1 }, { id: 2 }))
            );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 2 }), new Image({ id: 1 })]
                })
              ]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        describe("with 'where in' configured on the joined query", () => {
          it('fulfils the requested query on the joined model', async () => {
            await Image.insert([
              { id: 2, userId: 1, categoryId: 1 },
              { id: 3, userId: 1, categoryId: 1 }
            ]);

            const where = new Query.Where();
            const query = new Query(User).leftJoin(
              new Query(Image).where(where.in('id', [1, 2]))
            );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 2 }), new Image({ id: 1 })]
                })
              ]
            );

            await Image.delete({ where: where.in('id', [2, 3]) });
          });
        });

        describe("with 'orderBy' configured on the joined query", () => {
          it('fulfils the requested order on the joined model', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image).orderBy({ id: -1 }));

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 2 }), new Image({ id: 1 })]
                })
              ]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        describe("with 'groupBy' configured on the joined query", () => {
          it('fulfils the requested grouping on the joined model', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const query = new Query(User)
              .where({ id: 1 })
              .groupBy('id')
              .leftJoin(new Query(Image).groupBy(['id', 'userId']));

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 1 }), new Image({ id: 2 })]
                })
              ]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        describe("with 'having' configured on the joined query", () => {
          it('fulfils the requested order on the joined model', async () => {
            await Image.insert([
              { id: 2, userId: 1, categoryId: 1 },
              { id: 3, userId: 2, categoryId: 1 }
            ]);

            const query = new Query(User)
              .where({ id: 1 })
              .groupBy('id')
              .leftJoin(
                new Query(Image).groupBy(['id', 'userId']).having({ userId: 1 })
              );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  image: [new Image({ id: 1 }), new Image({ id: 2 })]
                })
              ]
            );

            const where = new Query.Where();
            await Image.delete({ where: where.in('id', [2, 3]) });
          });
        });

        describe("with 'forge' disabled", () => {
          describe('on the parent query', () => {
            it('still forges the joined model', async () => {
              const query = new Query(User)
                .forge(false)
                .leftJoin(new Query(Image));

              await expect(
                query.fetch(),
                'to be fulfilled with sorted rows satisfying',
                [
                  expect.it('not to be a', User).and('to satisfy', {
                    image: [expect.it('to be an', Image)]
                  }),
                  expect.it('to be an object').and('not to be a', User)
                ]
              );
            });
          });

          describe('on the joined model', () => {
            it('includes a plain object of the joined model', async () => {
              const query = new Query(User).leftJoin(
                new Query(Image).forge(false)
              );

              await expect(
                query.fetch(),
                'to be fulfilled with sorted rows satisfying',
                [
                  expect.it('to be a', User).and('to satisfy', {
                    image: [
                      expect.it('to be an object').and('not to be an', Image)
                    ]
                  }),
                  expect.it('to be a', User)
                ]
              );
            });
          });

          describe('on both the parent and the joined models', () => {
            it('includes plain objects of the both models', async () => {
              const query = new Query(User)
                .forge(false)
                .leftJoin(new Query(Image).forge(false));

              await expect(
                query.fetch(),
                'to be fulfilled with sorted rows exhaustively satisfying',
                [
                  expect.it('not to be a', User).and('to satisfy', {
                    image: [
                      expect.it('to be an object').and('not to be an', Image)
                    ]
                  }),
                  expect.it('to be an object').and('not to be a', User)
                ]
              );
            });
          });

          it('does not include the joined model if no rows were matched', async () => {
            const query = new Query(User)
              .leftJoin(new Query(Image))
              .where({ id: 2 })
              .forge(false);

            await expect(
              query.fetch(),
              // TODO: hmmmmmmm
              'to be fulfilled with sorted rows exhaustively satisfying',
              [{ image: undefined }]
            );
          });

          it('includes all joined models if more than one rows are matched', async () => {
            await Image.insert({ id: 2, userId: 1, categoryId: 1 });

            const query = new Query(User)
              .where({ id: 1 })
              .leftJoin(new Query(Image));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [{ id: 1, name: 'User 1', image: [{ id: 1 }, { id: 2 }] }]
            );

            await Image.delete({ where: { id: 2 } });
          });
        });

        it('allows passing a model directly', async () => {
          const query = new Query(User).leftJoin(Image);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                image: [new Image({ id: 1 })]
              }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('allows passing options when a model is passed directly', async () => {
          const query = new Query(User).leftJoin(Image, { fields: 'id' });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                image: [
                  expect.it('to exhaustively satisfy', new Image({ id: 1 }))
                ]
              }),
              new User({
                id: 2,
                name: 'User 2'
              })
            ]
          );
        });

        describe('with a reverse-reference join', () => {
          it('resolves with the correct data', async () => {
            const query = new Query(Image).leftJoin(new Query(User));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows satisfying',
              [
                new Image({
                  id: 1,
                  user: [new User({ id: 1, name: 'User 1' })]
                })
              ]
            );
          });

          it("supports the 'on' option as a string", async () => {
            const query = new Query(Image).leftJoin(new Query(User).on('id'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new Image({
                  id: 1,
                  user: [new User({ id: 1, name: 'User 1' })]
                })
              ]
            );
          });

          it('resolves with the correct data when a field is referenced by multiple fields', async () => {
            const query = new Query(Message).leftJoin(new Query(User).on('id'));
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new Message({
                  id: 1,
                  senderId: 1,
                  receiverId: 2,
                  text: 'Hi User 2',
                  user: [new User({ id: 2, name: 'User 2' })]
                }),
                new Message({
                  id: 2,
                  senderId: 2,
                  receiverId: 1,
                  text: 'Hi User 1',
                  user: [new User({ id: 1, name: 'User 1' })]
                })
              ]
            );
          });
        });

        describe("with a nested 'leftJoin' query", () => {
          it('includes the nested data in the returned data if rows are matched', async () => {
            const query = new Query(User).leftJoin(
              new Query(Image).leftJoin(new Query(ImageCategory))
            );
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: null,
                  image: [
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1,
                      imageCategory: [
                        new ImageCategory({ id: 1, name: 'User images' })
                      ]
                    })
                  ]
                }),
                new User({ id: 2, name: 'User 2', confirmed: true })
              ]
            );
          });
        });

        describe("with a circular 'leftJoin' query", () => {
          it('includes the circular data in the returned data', async () => {
            const query = new Query(User).leftJoin(
              new Query(Image).leftJoin(
                new Query(ImageCategory).leftJoin(
                  new Query(Image).leftJoin(new Query(User))
                )
              )
            );
            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: null,
                  image: [
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1,
                      imageCategory: [
                        new ImageCategory({
                          id: 1,
                          name: 'User images',
                          image: [
                            new Image({
                              id: 1,
                              userId: 1,
                              categoryId: 1,
                              user: [
                                new User({
                                  id: 1,
                                  name: 'User 1',
                                  confirmed: null
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                new User({
                  id: 2,
                  name: 'User 2',
                  confirmed: true
                })
              ]
            );
          });
        });
      });

      describe("with an 'innerJoin' configured", () => {
        it('returns the instances with matching data in the joined table (inner join)', async () => {
          const query = new Query(User).innerJoin(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1', image: [new Image({ id: 1 })] })]
          );
        });

        it("resolves with an empty array if the join doesn't match any rows", async () => {
          const query = new Query(User)
            .where({ id: 2 })
            .innerJoin(new Query(Image));

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            []
          );
        });
      });

      describe("with a 'join' configured", () => {
        it('returns the instances with matching data in the joined table (inner join)', async () => {
          const query = new Query(User).join(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [new User({ id: 1, name: 'User 1', image: [new Image({ id: 1 })] })]
          );
        });

        it("resolves wih an empty array if the join doesn't match any rows", async () => {
          const query = new Query(User)
            .where({ id: 2 })
            .innerJoin(new Query(Image));

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            []
          );
        });
      });
    });
  });
});
