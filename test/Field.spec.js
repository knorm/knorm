const uuid = require('uuid');
const Field = require('../Field');
const Model = require('../Model');

const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('./lib/unexpected-error'))
    .use(require('./lib/unexpected-workaround'));

describe('Field', function () {
    describe('constructor', function () {
        it('throws an error if the field name is not provided', function () {
            expect(
                () => new Field(),
                'to throw',
                new Error('Field requires a name')
            );
        });

        it('throws an error if the model is not provided', function () {
            expect(
                () => new Field({ name: 'foo' }),
                'to throw',
                new Error("Field 'foo' requires a subclass of Model")
            );
        });

        it('throws an error if the field type is not provided', function () {
            class Foo extends Model {}
            expect(
                () => new Field({
                    name: 'bar',
                    model: Foo,
                }),
                'to throw',
                new Error("Field 'Foo.bar' has no type configured")
            );
        });

        it('throws an error if the field type is not supported', function () {
            class Foo extends Model {}
            expect(
                () => new Field({
                    name: 'bar',
                    model: Foo,
                    type: 'bar',
                }),
                'to throw',
                new Error("Field 'Foo.bar' has an invalid type ('bar')")
            );
        });

        it("throws an error if 'validate' is provided and is not a function", function () {
            class Foo extends Model {}
            expect(
                () => new Field({
                    name: 'bar',
                    model: Foo,
                    type: Field.types.string,
                    validate: {
                        oneOf: [ 'foo', 'bar' ],
                    },
                }),
                'to throw',
                new Error("Custom validator for field 'Foo.bar' should be a function")
            );
        });

        it("calls setModel with the 'model' config passed", function () {
            class Foo extends Model {}
            const stub = sinon.stub(Field.prototype, 'setModel');
            new Field({
                name: 'bar',
                model: Foo,
                type: Field.types.string,
            });
            expect(stub, 'to have calls satisfying', () => {
                stub(expect.it('to be model class', Foo));
            });
            stub.restore();
        });

        it("calls setReference with the reference if a 'references' config is passed", function () {
            class Foo extends Model {}
            const stub = sinon.stub(Field.prototype, 'setReference');
            new Field({
                name: 'bar',
                references: 'foo bar',
                model: Foo,
                type: Field.types.string,
            });
            expect(stub, 'to have calls satisfying', () => {
                stub('foo bar');
            });
            stub.restore();
        });

        describe('without a column name configured', function () {
            it("calls getColumnName to set the field's column name", function () {
                class Foo extends Model {}
                const stub = sinon.stub(Field.prototype, 'getColumnName')
                    .returns('the column name');
                const field = new Field({
                    name: 'bar',
                    model: Foo,
                    type: Field.types.string,
                });
                expect(stub, 'to have calls satisfying', () => {
                    stub();
                });
                expect(field.column, 'to be', 'the column name');
                stub.restore();
            });
        });

        describe('with a column name configured', function () {
            it('does not call getColumnName', function () {
                class Foo extends Model {}
                const spy = sinon.spy(Field.prototype, 'getColumnName');
                new Field({
                    name: 'bar',
                    model: Foo,
                    type: Field.types.string,
                    column: 'bar',
                });
                expect(spy, 'was not called');
                spy.restore();
            });

            it("sets the field's column name from configured value", function () {
                class Foo extends Model {}
                const field = new Field({
                    name: 'bar',
                    model: Foo,
                    type: Field.types.string,
                    column: 'the column name',
                });
                expect(field.column, 'to be', 'the column name');
            });
        });
    });

    describe('Field.prototype.clone', function () {
        it('returns a clone of the field', function () {
            class Foo extends Model {}
            const field = new Field({
                name: 'bar',
                model: Foo,
                type: Field.types.string,
            });
            expect(field.clone(), 'to equal', new Field({
                name: 'bar',
                model: Foo,
                type: Field.types.string,
            }));
        });
    });

    describe('Field.prototype.getColumnName', function () {
        it('returns a snake-cased version of the passed field name', function () {
            class Foo extends Model {}
            const field = new Field({
                name: 'firstName',
                model: Foo,
                type: Field.types.string,
            });
            expect(field.getColumnName(), 'to be', 'first_name');
        });
    });

    describe('Field.prototype.hasDefault', function () {
        class User extends Model {}

        it('returns false if the field was not configured with a default value', function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });
            expect(field.hasDefault(), 'to be false');
        });

        it('returns true if the field was configured with a default value', function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
                default: 'foo',
            });
            expect(field.hasDefault(), 'to be true');
        });

        it('returns true if the field was configured with a default value as a function', function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
                default: () => {},
            });
            expect(field.hasDefault(), 'to be true');
        });
    });

    describe('Field.prototype.getDefault', function () {
        class User extends Model {}

        it('returns the default value configured', function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
                default: 'foo',
            });
            expect(field.getDefault(), 'to be', 'foo');
        });

        describe('when the default value is a function', function () {
            it('returns the return value of the function', function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    default: () => 'bar',
                });
                expect(field.getDefault(), 'to be', 'bar');
            });

            it("calls the function with 'this' set to the instance passed", function () {
                const stub = sinon.stub().returns('bar');
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    default: stub,
                });
                field.getDefault('a model instance');
                expect(stub, 'was called once')
                    .and('was called on', 'a model instance');
            });

        });
    });

    describe('Field.prototype.validate', function () {
        class User extends Model {}

        it('returns a Promise', async function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });
            await expect(field.validate(), 'to be fulfilled');
        });

        describe('required', function () {
            it('rejects with an error matching MissingRequiredModelFieldError if no value is passed', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    required: true,
                });
                await expect(field.validate(), 'to be rejected with', {
                    BadRequest: true,
                    MissingRequiredUserFirstNameError: true,
                });
            });

            it("rejects if the value is 'undefined'", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    required: true,
                });
                await expect(field.validate(undefined), 'to be rejected with', {
                    BadRequest: true,
                    MissingRequiredUserFirstNameError: true,
                });
            });

            it("rejects if the value is 'null'", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    required: true,
                });
                await expect(field.validate(null), 'to be rejected with', {
                    BadRequest: true,
                    MissingRequiredUserFirstNameError: true,
                });
            });

            it('resolves if the value is set', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    required: true,
                });
                await expect(field.validate('foo'), 'to be fulfilled');
            });
        });

        describe('type', function () {
            it('rejects with a named error matching InvalidModelFieldTypeError if an invalid value is set', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.text,
                });
                await expect(field.validate({}), 'to be rejected with', {
                    InvalidUserFirstNameTypeError: true,
                });
            });

            it('does not type-validate if the value is undefined', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.text,
                });
                await expect(field.validate(undefined), 'to be fulfilled');
            });

            it('does not type-validate if the value is null', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.text,
                });
                await expect(field.validate(null), 'to be fulfilled');
            });

            describe('resolves for valid types', function () {
                it("strings against the 'string' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.string,
                    });
                    await expect(field.validate('foo'), 'to be fulfilled');
                });

                it("strings against the 'text' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.text,
                    });
                    await expect(field.validate('foo'), 'to be fulfilled');
                });

                it("numbers against the 'integer' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.integer,
                    });
                    await expect(field.validate(1), 'to be fulfilled');
                });

                it("dates against the 'dateTime' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.dateTime,
                    });
                    await expect(field.validate(new Date()), 'to be fulfilled');
                });

                it("true against the 'boolean' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.boolean,
                    });
                    await expect(field.validate(true), 'to be fulfilled');
                });

                it("false against the 'boolean' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.boolean,
                    });
                    await expect(field.validate(false), 'to be fulfilled');
                });

                it("uuid.v4 against the 'uuid' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.uuid,
                    });
                    await expect(field.validate(uuid.v4()), 'to be fulfilled');
                });

                it("uuid.v1 against the 'uuid' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.uuid,
                    });
                    await expect(field.validate(uuid.v1()), 'to be fulfilled');
                });

                it("uuid.v4 against the 'uuidV4' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.uuidV4,
                    });
                    await expect(field.validate(uuid.v4()), 'to be fulfilled');
                });

                it("string empty array against the 'json' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.json,
                    });
                    await expect(field.validate('[]'), 'to be fulfilled');
                });

                it("string empty object against the 'json' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.json,
                    });
                    await expect(field.validate('{}'), 'to be fulfilled');
                });

                it("string json against the 'json' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.json,
                    });
                    await expect(
                        field.validate('[{ "foo": "foo", "bar": "bar" }]'),
                        'to be fulfilled'
                    );
                });

                it("floating point values against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate(10.56), 'to be fulfilled');
                });

                it("floating point values without whole numbers against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate(.5600976), 'to be fulfilled');
                });

                it("integer values against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate(30), 'to be fulfilled');
                });

                it("zero against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate(0), 'to be fulfilled');
                });

                it("string floating point values against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate('10.00'), 'to be fulfilled');
                });

                it("positive string floating point values against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate('+10.00345'), 'to be fulfilled');
                });

                it("negative floating point values against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate(-9923410.03), 'to be fulfilled');
                });

                it("buffer values against the 'binary' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.binary,
                    });
                    await expect(field.validate(Buffer.from('')), 'to be fulfilled');
                });
            });

            describe('rejects for invalid types', function () {
                it("for fractions against the 'integer' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.integer,
                    });
                    await expect(field.validate(1.5), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("for string numbers against the 'integer' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.integer,
                    });
                    await expect(field.validate('1'), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("for date strings against the 'dateTime' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.dateTime,
                    });
                    await expect(
                        field.validate(new Date().toString()),
                        'to be rejected with',
                        {
                            BadRequest: true,
                            InvalidUserFirstNameTypeError: true,
                        }
                    );
                });

                it("for truthy values against the 'boolean' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.boolean,
                    });
                    await expect(field.validate(1), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("for falsy values against the 'boolean' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.boolean,
                    });
                    await expect(field.validate(0), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("invalid uuid's against the 'uuid' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.uuid,
                    });
                    await expect(
                        field.validate('not-valid-uuid'),
                        'to be rejected with',
                        {
                            BadRequest: true,
                            InvalidUserFirstNameTypeError: true,
                        }
                    );
                });

                it("uuid.v1 against the 'uuidV4' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.uuidV4,
                    });
                    await expect(
                        field.validate(uuid.v1()),
                        'to be rejected with',
                        {
                            BadRequest: true,
                            InvalidUserFirstNameTypeError: true,
                        }
                    );
                });

                it("invalid json against the 'json' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.json,
                    });
                    await expect(
                        field.validate('{not: "valid"}'),
                        'to be rejected with',
                        {
                            BadRequest: true,
                            InvalidUserFirstNameTypeError: true,
                        }
                    );
                });

                it("false against the 'json' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.json,
                    });
                    await expect(field.validate(false), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("strings against the 'decimal' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.decimal,
                    });
                    await expect(field.validate('foo'), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("string values against the 'binary' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.binary,
                    });
                    await expect(field.validate('bar'), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });

                it("object values against the 'binary' type", async function () {
                    const field = new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.binary,
                    });
                    await expect(field.validate({}), 'to be rejected with', {
                        BadRequest: true,
                        InvalidUserFirstNameTypeError: true,
                    });
                });
            });
        });

        describe('minLength', function () {
            it('rejects with an error matching ModelFieldTooShortError if the value is shorter than the minLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    minLength: 6,
                });
                await expect(field.validate('a'), 'to be rejected with', {
                    BadRequest: true,
                    UserFirstNameTooShortError: true,
                });
            });

            it('does not reject an if the value is the same lenth as the minLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    minLength: 6,
                });
                await expect(field.validate('123456'), 'to be fulfilled');
            });

            it('does not reject an if the value is longer than the minLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    minLength: 6,
                });
                await expect(field.validate('1234567'), 'to be fulfilled');
            });

            it('does not reject if the value is undefined', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    minLength: 6,
                });
                await expect(field.validate(undefined), 'to be fulfilled');
            });

            it("does not reject if the passed value is 'null'", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    minLength: 6,
                });
                await expect(field.validate(null), 'to be fulfilled');
            });
        });

        describe('validates maxLength', function () {
            it('rejects with an error matching ModelFieldTooLongError if the value is longer than the maxLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    maxLength: 6,
                });
                await expect(field.validate('1234567'), 'to be rejected with', {
                    BadRequest: true,
                    UserFirstNameTooLongError: true,
                });
            });

            it('does not reject an if the value is the same lenth as the maxLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    maxLength: 6,
                });
                await expect(field.validate('123456'), 'to be fulfilled');
            });

            it('does not reject an if the value is shorter than the maxLength', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    maxLength: 6,
                });
                await expect(field.validate('12345'), 'to be fulfilled');
            });

            it('does not reject if the value is undefined', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    maxLength: 6,
                });
                await expect(field.validate(undefined), 'to be fulfilled');
            });

            it("does not reject if the passed value is 'null'", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    maxLength: 6,
                });
                await expect(field.validate(null), 'to be fulfilled');
            });
        });

        describe('validates oneOf', function () {
            it('rejects with an error matching UnknownModelFieldError if the value is not included in oneOf', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                    oneOf: [ 1, 2 ],
                });
                await expect(field.validate(3), 'to be rejected with', {
                    BadRequest: true,
                    UnknownUserFirstNameError: true,
                });
            });

            it('does not reject an if the value is included in oneOf', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                    oneOf: [ 1, 2 ],
                });
                await expect(field.validate(1), 'to be fulfilled');
            });

            it('checks against the casing of strings', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    oneOf: [ 'READ', 'UNREAD' ],
                });
                await expect(field.validate('read'), 'to be rejected with', {
                    BadRequest: true,
                    UnknownUserFirstNameError: true,
                });
            });

            it('does not reject if the value is undefined', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                    oneOf: [ 1, 2 ],
                });
                await expect(field.validate(undefined), 'to be fulfilled');
            });

            it("does not reject if the passed value is 'null'", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                    oneOf: [ 1, 2 ],
                });
                await expect(field.validate(null), 'to be fulfilled');
            });
        });

        describe('with a custom validator', function () {
            it('calls the validator with the passed value', async function () {
                const validate = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate,
                });
                await field.validate('bar value');
                await expect(validate, 'to have calls satisfying', () => {
                    validate('bar value');
                });
            });

            it("calls the validator with 'this' set to the passed model instance", async function () {
                const validate = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate,
                });
                await field.validate('bar value', 'a model instance');
                await expect(validate, 'was called once')
                    .and('was called on', 'a model instance');
            });

            it('does not call the validator if no value is passed', async function () {
                const validate = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate,
                });
                await field.validate();
                await expect(validate, 'was not called');
            });

            it("does not call the validator if the passed value is 'null'", async function () {
                const validate = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate,
                });
                await field.validate(null);
                await expect(validate, 'was not called');
            });

            it('rejects with the error thrown from the validator', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        throw new Error('custom error');
                    },
                });
                await expect(
                    field.validate('bar value'),
                    'to be rejected with',
                    new Error('custom error')
                );
            });

            it('rejects with the rejection reason returned from the validator', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return Promise.reject(new Error('rejection reason'));
                    },
                });
                await expect(
                    field.validate('bar value'),
                    'to be rejected with',
                    new Error('rejection reason')
                );
            });

            it('rejects with an error matching InvalidModelFieldError if the validator returns false', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return false;
                    },
                });
                await expect(field.validate('bar value'), 'to be rejected with', {
                    BadRequest: true,
                    InvalidUserFirstNameError: true,
                });
            });

            it('does not reject if the validator returns nothing', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {},
                });
                await expect(field.validate(), 'to be fulfilled');
            });

            it('runs the new validators if the validator returns an object with validators', async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return {
                            maxLength: 2,
                        };
                    },
                });
                await expect(field.validate('bar value'), 'to be rejected with', {
                    BadRequest: true,
                    UserFirstNameTooLongError: true,
                });
            });

            it("runs the new validator if the first validator returns an object with a 'validate' function", async function () {
                const secondValidateSpy = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return {
                            validate: secondValidateSpy,
                        };
                    },
                });
                await field.validate('bar value');
                expect(secondValidateSpy, 'to have calls satisfying', () => {
                    secondValidateSpy('bar value');
                });
            });

            it("runs the new custom validator with 'this' set to the passed model instance", async function () {
                const secondValidateSpy = sinon.spy();
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return {
                            validate: secondValidateSpy,
                        };
                    },
                });
                await field.validate('bar value', 'a model instance');
                await expect(secondValidateSpy, 'was called once')
                    .and('was called on', 'a model instance');
            });

            it('runs the new custom validator asynchronously', async function () {
                let called;
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return {
                            validate() {
                                return Promise.resolve().then(() => {
                                    called = true;
                                });
                            },
                        };
                    },
                });
                await field.validate('bar value');
                expect(called, 'to be true');
            });

            it("does nothing if the validator returns an object that doesn't contain validators", async function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.string,
                    validate() {
                        return new Date();
                    },
                });
                await expect(field.validate(), 'to be fulfilled');
            });
        });

        it('validates maxLength: 255 by default for string types', async function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });

            await expect(
                field.validate(new Array(255).fill('a').join('')),
                'to be fulfilled'
            );

            await expect(
                field.validate(new Array(256).fill('a').join('')),
                'to be rejected with',
                {
                    BadRequest: true,
                    UserFirstNameTooLongError: true,
                }
            );
        });
    });

    describe('Field.prototype.setReference', function () {
        it("stores the reference in the field's data properties", function () {
            class User extends Model {}

            const firstName = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });
            const lastName = new Field({
                name: 'lastName',
                model: User,
                type: Field.types.string,
            });

            firstName.setReference(lastName);

            expect(firstName.references, 'to equal', lastName);
        });

        it("adds the reference to the field's model's references", function () {
            class User extends Model {}
            class Image extends Model {}

            const id = new Field({
                name: 'id',
                model: User,
                type: Field.types.integer,
            });
            const createdAt = new Field({
                name: 'createdAt',
                model: User,
                type: Field.types.dateTime,
            });
            const userId = new Field({
                name: 'userId',
                model: Image,
                type: Field.types.integer,
            });
            const userCreatedAt = new Field({
                name: 'userCreatedAt',
                model: Image,
                type: Field.types.dateTime,
            });

            userId.setReference(id);
            userCreatedAt.setReference(createdAt);

            expect(User.references, 'to equal', {});
            expect(Image.references, 'to exhaustively satisfy', {
                User: {
                    userId: id,
                    userCreatedAt: createdAt,
                },
            });
        });

        it('adds back-references to the referenced model', function () {
            class User extends Model {}
            class Image extends Model {}

            const id = new Field({
                name: 'id',
                model: User,
                type: Field.types.integer,
            });
            const createdAt = new Field({
                name: 'createdAt',
                model: User,
                type: Field.types.dateTime,
            });
            const userId = new Field({
                name: 'userId',
                model: Image,
                type: Field.types.integer,
            });
            const userCreatedAt = new Field({
                name: 'userCreatedAt',
                model: Image,
                type: Field.types.dateTime,
            });

            userId.setReference(id);
            userCreatedAt.setReference(createdAt);

            expect(Image.referenced, 'to equal', {});
            expect(User.referenced, 'to exhaustively satisfy', {
                Image: {
                    id: userId,
                    createdAt: userCreatedAt,
                },
            });
        });

        it('allows chaining', function () {
            class User extends Model {}
            const firstName = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });
            const lastName = new Field({
                name: 'lastName',
                model: User,
                type: Field.types.string,
            });
            expect(firstName.setReference(lastName), 'to equal', firstName);
        });
    });

    describe('Field.prototype.setModel', function () {
        class User extends Model {}

        it("creates errors for all the validators with the model's name", function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });

            field.errors = undefined;
            field.setModel(User);

            expect(field.errors, 'to satisfy', {
                Required: expect.it('to be an error named', 'MissingRequiredUserFirstNameError')
                    .and('to be an error that extends', 'BadRequest'),
                Type: expect.it('to be an error named', 'InvalidUserFirstNameTypeError')
                    .and('to be an error that extends', 'BadRequest'),
                MinLength: expect.it('to be an error named', 'UserFirstNameTooShortError')
                    .and('to be an error that extends', 'BadRequest'),
                MaxLength: expect.it('to be an error named', 'UserFirstNameTooLongError')
                    .and('to be an error that extends', 'BadRequest'),
                OneOf: expect.it('to be an error named', 'UnknownUserFirstNameError')
                    .and('to be an error that extends', 'BadRequest'),
                Custom: expect.it('to be an error named', 'InvalidUserFirstNameError')
                    .and('to be an error that extends', 'BadRequest'),
            });
        });

        it('allows chaining', function () {
            const field = new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string,
            });
            expect(field.setModel(User), 'to equal', field);
        });

        describe('when called again', function () {
            class Employee extends User {}

            it('updates the model that the field belongs to', function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                });

                expect(field.model, 'to equal', User);
                field.setModel(Employee);
                expect(field.model, 'to equal', Employee);
            });

            it("re-creates the field's errors with the new model's name", function () {
                const field = new Field({
                    name: 'firstName',
                    model: User,
                    type: Field.types.integer,
                });

                expect(field.errors, 'to satisfy', {
                    Required: expect.it('to be an error named', 'MissingRequiredUserFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                    Type: expect.it('to be an error named', 'InvalidUserFirstNameTypeError')
                        .and('to be an error that extends', 'BadRequest'),
                    MinLength: expect.it('to be an error named', 'UserFirstNameTooShortError')
                        .and('to be an error that extends', 'BadRequest'),
                    MaxLength: expect.it('to be an error named', 'UserFirstNameTooLongError')
                        .and('to be an error that extends', 'BadRequest'),
                    OneOf: expect.it('to be an error named', 'UnknownUserFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                    Custom: expect.it('to be an error named', 'InvalidUserFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                });

                field.setModel(Employee);

                expect(field.errors, 'to satisfy', {
                    Required: expect.it('to be an error named', 'MissingRequiredEmployeeFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                    Type: expect.it('to be an error named', 'InvalidEmployeeFirstNameTypeError')
                        .and('to be an error that extends', 'BadRequest'),
                    MinLength: expect.it('to be an error named', 'EmployeeFirstNameTooShortError')
                        .and('to be an error that extends', 'BadRequest'),
                    MaxLength: expect.it('to be an error named', 'EmployeeFirstNameTooLongError')
                        .and('to be an error that extends', 'BadRequest'),
                    OneOf: expect.it('to be an error named', 'UnknownEmployeeFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                    Custom: expect.it('to be an error named', 'InvalidEmployeeFirstNameError')
                        .and('to be an error that extends', 'BadRequest'),
                });
            });

            describe('when the field has a reference', function () {
                it('updates the back-references to the new model', function () {
                    class Image extends Model {}

                    const id = new Field({
                        name: 'id',
                        model: User,
                        type: Field.types.integer,
                    });
                    const userId = new Field({
                        name: 'userId',
                        model: Image,
                        type: Field.types.integer,
                        references: id,
                    });

                    expect(User.referenced, 'to exhaustively satisfy', {
                        Image: {
                            id: userId,
                        },
                    });

                    class UserImage extends User {}

                    userId.setModel(UserImage);

                    expect(User.referenced, 'to exhaustively satisfy', {
                        UserImage: {
                            id: userId,
                        },
                    });
                });
            });
        });
    });
});
