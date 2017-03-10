const createErrors = require('../../../lib/helpers/createErrors');
const createError = require('createerror');
const httpErrors = require('httperrors');

const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'));

describe('createErrors helper', function () {
    describe('when passed a string as the error name', function () {
        it('creates an error that inherits from the error defined by the second parameter', function () {
            const ParentError = createError({
                name: 'BarError'
            });
            const CreatedError = createErrors('FooError', ParentError);
            return expect(new CreatedError(), 'to satisfy', {
                FooError: true,
                BarError: true
            });
        });

        it('creates an error without a parent if not passed a second parameter', function () {
            const CreatedError = createErrors('FooError');
            return expect(new CreatedError(), 'to satisfy', {
                FooError: true
            });
        });
    });

    describe('when passed an object of the form { ErrorName: ParentError }', function () {
        it('creates an error named ErrorName that inherits from ParentError', function () {
            const parent = createError();
            return expect(createErrors({
                FooError: parent
            }), 'to satisfy', {
                FooError: createError({
                    name: 'FooError'
                }, parent)
            });
        });

        it('creates an error that does not inherit from anything if ParentError is null', function () {
            return expect(createErrors({
                FooError: null
            }), 'to satisfy', {
                FooError: createError({
                    name: 'FooError'
                })
            });
        });

        it('creates an error that inherits from httpErrors.BadRequest if ParentError is provided as "BadRequest"', function () {
            return expect(createErrors({
                FooError: 'BadRequest'
            }), 'to satisfy', {
                FooError: createError({
                    name: 'FooError'
                }, httpErrors.BadRequest)
            });
        });

        it('creates an error that inherits from httpErrors.BadRequest if ParentError is provided as "400"', function () {
            return expect(createErrors({
                FooError: 400
            }), 'to satisfy', {
                FooError: createError({
                    name: 'FooError'
                }, httpErrors.BadRequest)
            });
        });

        it('throws an error if ParentError is provided as a string but is not one of the httpErrors', function () {
            return expect(function () {
                createErrors({
                    FooError: 'blah'
                });
            }, 'to throw', /Invalid parent error/);
        });

        it('throws an error if ParentError is provided as a number but is not one of the httpErrors', function () {
            return expect(function () {
                createErrors({
                    FooError: 10000
                });
            }, 'to throw', /Invalid parent error/);
        });

        it('creates an error for every key in the object', function () {
            return expect(createErrors({
                FooError: 400,
                BarError: 503
            }), 'to satisfy', {
                FooError: createError({
                    name: 'FooError'
                }, httpErrors.BadRequest),
                BarError: createError({
                    name: 'BarError'
                }, httpErrors.TemporarilyUnavailable)
            });
        });
    });
});
