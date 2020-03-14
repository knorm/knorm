const expect = require('unexpected').clone();
const ValidationError = require('../lib/ValidationError');
const KnormError = require('../lib/KnormError');
const AbstractModel = require('../lib/Model');
const AbstractField = require('../lib/Field');

class Field extends AbstractField {}

class User extends AbstractModel {}

describe('ValidationError', () => {
  it('extends KnormError', () => {
    expect(ValidationError.prototype, 'to be a', KnormError);
  });

  it('formats correct error messages by type of validator', () => {
    const field = new Field({
      name: 'firstName',
      type: 'string',
      model: User
    });

    expect(
      new ValidationError({ field, validator: { required: true } }),
      'to satisfy',
      {
        type: 'RequiredError',
        message: 'Missing required value for field `User.firstName`'
      }
    );
  });

  it('formats correct error messages by type of validator', () => {
    const field = new Field({
      name: 'firstName',
      type: 'string',
      model: User
    });

    expect(
      new ValidationError({ field, validator: { required: true } }),
      'to satisfy',
      {
        type: 'RequiredError',
        message: 'Missing required value for field `User.firstName`'
      }
    );
  });

  it('allows overriding formatMessage to customize error messages', () => {
    class CustomValidationError extends ValidationError {
      formatMessage({ field }) {
        return `my custom error for ${field.name}`;
      }
    }
    const field = new Field({
      name: 'firstName',
      type: 'string',
      model: User
    });
    expect(new CustomValidationError({ field }), 'to satisfy', {
      message: 'my custom error for firstName'
    });
  });
});
