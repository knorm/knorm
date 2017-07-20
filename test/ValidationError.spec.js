const expect = require('unexpected').clone();
const ValidationError = require('../lib/ValidationError');
const KnormError = require('../lib/KnormError');
const AbstractModel = require('../lib/Model');
const AbstractField = require('../lib/Field');

class Field extends AbstractField {}

class User extends AbstractModel {}

describe('ValidationError', function () {
    it('extends KnormError', () => {
        expect(ValidationError.prototype, 'to be a', KnormError);
    });

    it('prepends error messages with the model name and field name', function () {
        const field = new Field({
            name: 'firstName',
            type: 'string',
            model: User,
        });
        expect(new ValidationError('foo bar', field), 'to satisfy', {
            message: 'User.firstName: foo bar',
        });
    });
});
