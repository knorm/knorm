const createError = require('../lib/createError');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'));

describe('createErrors helper', function () {
    it('creates a custom error that inherits Error', function () {
        const MyError = createError('MyError');
        expect(MyError.prototype, 'to be an', Error);
    });

    it('sets the constructor name of the error', function () {
        const MyError = createError('MyError');
        expect(MyError.name, 'to be', 'MyError');
    });

    it('sets the error name on error instances', function () {
        const MyError = createError('MyError');
        expect(new MyError().name, 'to be', 'MyError');
    });

    it('creates errors with the correct stack trace', function () {
        const MyError = createError('MyError');
        const temp = {};
        Error.captureStackTrace(temp); const error = new MyError();
        temp.stack = temp.stack
            .replace(/^Error\n/, 'MyError\n')
            .replace(/createError\.spec\.js:(\d+):15/, 'createError.spec.js:$1:54');
        expect(error.stack, 'to be', temp.stack);
    });

    describe('with a parent error passed', function () {
        it('creates an error that inherits the passed error', function () {
            const ParentError = createError('ParentError');
            const ChildError = createError('MyError', ParentError);
            expect(ChildError.prototype, 'to be a', ParentError);
        });
    });
});
