import unexpected from 'unexpected';
import { KnormError } from '../src/KnormError';
import { ValidationError } from '../src/ValidationError';
import { Model } from '../src/Model';
import { Field as BaseField } from '../src/Field';

const expect = unexpected.clone();

describe('ValidationError', () => {
  let Field;
  let User;

  before(() => {
    Field = class extends BaseField {};
    User = class extends Model {};
  });

  it('extends KnormError', () => {
    expect(ValidationError.prototype, 'to be a', KnormError);
  });

  it('formats correct error messages by type of validator', () => {
    const field = new Field({
      name: 'firstName',
      type: 'string',
      model: User,
    });

    expect(
      new ValidationError({ field, validator: { required: true } }),
      'to satisfy',
      {
        type: 'RequiredError',
        message: 'Missing required value for field `User.firstName`',
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
      model: User,
    });
    expect(new CustomValidationError({ field }), 'to satisfy', {
      message: 'my custom error for firstName',
    });
  });
});
