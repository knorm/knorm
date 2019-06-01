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
   */
  constructor(Model, config) {
    const {
      name,
      type,
      cast,
      virtual = false,
      getValue,
      setValue,
      column,
      primary = false,
      updated = true,
      unique = false,
      methods = false,
      validate
    } = config;

    if (!type) {
      return this.throwFieldError('no type configured');
    }

    if (!this.constructor.types.includes(type)) {
      return this.throwFieldError('invalid type configured');
    }

    // TODO: is Model needed?
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

    if (cast) {
      this._createCastors(cast);
    }
  }

  throwFieldError(message) {
    throw new this.constructor.FieldError({
      message,
      field: this
    });
  }

  _createCastors({ forSave, forFetch }) {
    if (forSave) {
      if (typeof forSave !== 'function') {
        throw new Error(
          `\`cast.forSave\` option for field ${
            this.displayName
          } should be a function`
        );
      }
      this.castors = this.castors || {};
      this.castors.forSave = forSave;
    }
    if (forFetch) {
      if (typeof forFetch !== 'function') {
        throw new Error(
          `\`cast.forFetch\` option for field ${
            this.displayName
          } should be a function`
        );
      }
      this.castors = this.castors || {};
      this.castors.forFetch = forFetch;
    }
  }

  /**
   * Casts a {@link Field}'s value with its configured cast functions.
   *
   * @param {*} value The value to be cast.
   * @param {Model} model The {@link Model} instance where the field's
   * value is set. The cast functions will be called with this instance as a
   * parameter.
   * @param {object} options Cast options.
   * @param {boolean} options.forSave Whether or not to cast for save operations
   * (i.e before insert or update). This function is called with the `value` as
   * the first paramter and `model` as the second parameter.
   * @param {boolean} options.forFetch Whether or not to cast for fetch
   * operations (i.e after fetch or any other operations that return data from
   * the database). This function is called with the `value` as the first
   * paramter and `model` as the second parameter.
   *
   * @returns {*} The cast value, or `undefined` if no cast functions are
   * configured for the {@link Field} instance.
   */
  cast(value, model, { forSave, forFetch }) {
    if (!this.castors) {
      return;
    }

    if (forSave) {
      if (!this.castors.forSave) {
        return;
      }
      return this.castors.forSave(value, model);
    }

    if (forFetch) {
      if (!this.castors.forFetch) {
        return;
      }
      return this.castors.forFetch(value, model);
    }
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
