/**
 * Creates and holds configuration for fields.
 */
class Field {
  /**
   * A function to get a {@link Field}'s value from a {@link Model} instance.
   *
   * @callback Field~getValue
   * @param {Model} model The {@link Model} instance.
   *
   * @returns {*} The {@link Field}'s value.
   */

  /**
   * A function to set a {@link Field}'s value on a {@link Model} instance.
   *
   * @callback Field~setValue
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The value to set.
   */

  /**
   * A function to get a {@link Field}'s default value to be set on a
   * {@link Model} instance.
   *
   * @callback Field~getDefault
   * @param {Model} model The {@link Model} instance.
   *
   * @returns {*} The {@link Field}'s default value.
   */

  /**
   * A function to cast a {@link Field}'s value before it's saved to the
   * database.
   *
   * @callback Field~castValueBeforeSave
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The {@link Field}'s value, before casting.
   *
   * @returns {*} The cast value.
   */

  /**
   * A function to cast a {@link Field}'s value before after it's fetched from
   * the database.
   *
   * @callback Field~castValueAfterFetch
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The {@link Field}'s value, before casting.
   *
   * @returns {*} The cast value.
   */

  /**
   * Creates a {@link Field} instance.
   *
   * @param {Model} Model The {@link Model} that the field is added to.
   * @param {object} config The field's config.
   * @param {string} config.name The field's name.
   * @param {string} config.type The field's type. This should be one of the
   * types defined in {@link Field.types}.
   * @param {boolean} [config.virtual=false] Whether or not the field is a
   * virtual field. A virtual field is any field that does not map to a column
   * on the database, whereas a database field is one that does.
   * @param {Field~getValue} [config.getValue] A function to get the field's
   * value from a {@link Model} instance, ideally for virtual fields.
   * @param {Field~setValue} [config.setValue] A function to set the field's
   * value on a {@link Model} instance, ideally virtual fields.
   * @param {*|Field~getDefault} [config.default] The field's default value.
   * This could also be a {@link Field~getDefault} function that returns the
   * field's default value.
   * @param {string} [config.column] The field's column-name. This is only used
   * for database (non-virtual) fields.
   * @param {boolean} [config.primary=false] Whether or not the field is a
   * primary field. This is only used for database (non-virtual) fields.
   * @param {boolean} [config.unique=false] Whether or not the field is a
   * unique field. This is only used for database (non-virtual) fields.
   * @param {boolean} [config.updated=false] Whether or not the field should be
   * updated in {@link Query#update} queries. This is only used for database
   * (non-virtual) fields.
   * @param {boolean} [config.methods=false] Whether or not static
   * `fetchByFieldName`, `updateByFieldName` and `deleteByFieldName` methods
   * should be created for the field. See the
   * [field guide](/guides/fields#generated-methods) for more information.
   * @param {object} [config.validate] A validation spec for the field's values.
   * See {@link Validate#validate} for more info.
   * @param {Field~castValueBeforeSave} [config.castValueBeforeSave] A function
   * to cast the field's value before it's saved to the database.
   * @param {Field~castValueAfterFetch} [config.castValueAfterFetch] A function
   * to cast the field's value after it's retrieved from the database.
   */
  constructor(Model, config) {
    const {
      name,
      type,
      virtual = false,
      getValue,
      setValue,
      column,
      primary = false,
      updated = true,
      unique = false,
      methods = false,
      validate,
      castValueBeforeSave,
      castValueAfterFetch
    } = config;

    if (!type) {
      return this.throwFieldError('no type configured');
    }

    if (!this.constructor.types.includes(type)) {
      return this.throwFieldError('invalid type configured');
    }

    this.Model = Model;

    this.config = config;
    this.name = name;
    this.type = type;
    this.virtual = virtual;
    this.getValue = getValue;
    this.setValue = setValue;
    this.column = column;
    this.primary = primary;
    this.unique = unique;
    this.updated = updated;
    this.methods = methods;
    this.default = config.default;
    this.validate = validate;
    this.castValueBeforeSave = castValueBeforeSave;
    this.castValueAfterFetch = castValueAfterFetch;
  }

  throwFieldError(message) {
    throw new this.constructor.FieldError({
      message,
      field: this
    });
  }
}

Field.knorm = Field.prototype.knorm = null;

module.exports = Field;

// TODO: add password type
// TODO: add all the types supported by knex
// TODO: document how to share validation logic with existing types
// TODO: document how to add new types
Field.types = [
  'virtual',
  'text',
  'json',
  'jsonb',
  'uuid',
  'uuid4',
  'binary',
  'decimal',
  'string',
  'boolean',
  'integer',
  'dateTime',
  'date',
  // custom types:
  'email',
  'any',
  'number',
  'object',
  'array'
];

Field.FieldError = require('./Field/FieldError');
