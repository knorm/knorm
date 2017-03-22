const createError = require('../lib/createError');
const expect = require('unexpected').clone();

describe('createError', function () {
    it('creates a custom error that inherits Error', function () {
        const MyError = createError('MyError');
        expect(MyError.prototype, 'to be an', Error);
    });

    it('sets the constructor name of the error', function () {
        const MyError = createError('MyError');
        expect(MyError.name, 'to be', 'MyError');
    });

    describe('with a parent error passed', function () {
        it('creates an error that inherits the passed error', function () {
            const ParentError = createError('ParentError');
            const ChildError = createError('MyError', ParentError);
            expect(ChildError.prototype, 'to be a', ParentError);
        });
    });

    describe('when error instances are created', function () {
        it('sets the correct error name', function () {
            const MyError = createError('MyError');
            expect(new MyError().name, 'to be', 'MyError');
        });

        it('sets the correct stack trace', function () {
            const MyError = createError('MyError');
            const temp = {};
            Error.captureStackTrace(temp); const error = new MyError();
            temp.stack = temp.stack
                .replace(/^Error\n/, 'MyError\n')
                .replace(/createError\.spec\.js:(\d+):19/, 'createError.spec.js:$1:58');
            expect(error.stack, 'to be', temp.stack);
        });

        it('sets the error message if passed a string', function () {
            const MyError = createError('MyError');
            expect(new MyError('foo bar'), 'to satisfy', {
                message: 'foo bar',
            });
        });

        describe('when passed another error instance', function () {
            it("sets the new error message from the instance's message", function () {
                const MyError = createError('MyError');
                const error = new Error('foo bar');
                expect(new MyError(error), 'to satisfy', {
                    message: 'foo bar',
                });
            });

            it('adds the passed error message as a data property', function () {
                const MyError = createError('MyError');
                const error = new Error('foo bar');
                expect(new MyError(error), 'to satisfy', {
                    originalError: new Error('foo bar'),
                });
            });
        });
    });
});
