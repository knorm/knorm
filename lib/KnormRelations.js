const { Knorm } = require('@knorm/knorm');
const { camelCase } = require('lodash');

const isArray = Array.isArray;
const asArray = value => (Array.isArray(value) ? value : [value]);

const addReference = (references, field, reference) => {
  const toModel = reference.model;
  references[toModel.name] = references[toModel.name] || {};
  references[toModel.name][field.name] = field;
};

class KnormRelations {
  constructor({ name = 'relations' } = {}) {
    this.name = name;
  }

  updateField(knorm) {
    const { Field } = knorm;

    class RelationsField extends Field {
      constructor(config = {}) {
        super(config);
        if (config.references) {
          this.references = config.references;
        }
      }
    }

    knorm.updateField(RelationsField);
  }

  updateModel(knorm) {
    const { Model } = knorm;

    class RelationsModel extends Model {
      static createConfig() {
        const config = super.createConfig();
        // NOTE: `rawReferences` is added to prevent breaking changes
        config.rawReferences = {};
        config.references = {};
        config.referenceFunctions = {};
        return config;
      }

      static addField(field) {
        super.addField(field);

        if (field.references) {
          const references = field.references;

          this._config.rawReferences[field.name] = references;

          if (typeof references === 'function') {
            this._config.referenceFunctions[field.name] = references;
          } else {
            (isArray(references) ? references : [references]).forEach(
              reference => {
                addReference(this._config.references, field, reference);
              }
            );
          }
        }
      }

      static removeField(field) {
        super.removeField(field);

        const { name, references } = field;

        if (references) {
          delete this._config.rawReferences[name];

          if (typeof references === 'function') {
            delete this._config.referenceFunctions[name];
          } else {
            const model = references.model.name;
            delete this._config.references[model][name];
            if (!Object.keys(this._config.references[model]).length) {
              delete this._config.references[model];
            }
          }
        }
      }

      // TODO: v3: make async
      // TODO: v3: unit test Model.getReferences
      static getReferences(Model) {
        const allReferences = this._config.rawReferences;
        const resolvedReferences = [];

        for (const [key, value] of Object.entries(allReferences)) {
          const fieldName = key;
          // TODO: any params to pass to the function?
          // TODO: v3: allow function to be async
          const references = typeof value === 'function' ? value() : value;

          for (const reference of asArray(references)) {
            // TODO: validate that reference is Field instance?
            if (reference.model === Model) {
              resolvedReferences.push({
                // TODO: Model.getField()
                from: this._config._fields[fieldName],
                to: reference
              });
            }
          }
        }

        return resolvedReferences;
      }
    }

    knorm.updateModel(RelationsModel);
  }

  updateQuery(knorm) {
    const { Query, Model } = knorm;

    class RelationsQuery extends Query {
      constructor(model) {
        super(model);
        // TODO: only initialize parsedRows when needed
        this.parsedRows = new Map();
        this.config.references = model.config.references;
        this.config.referenceFunctions = model.config.referenceFunctions;
      }

      addJoin(type, joins, options) {
        if (!isArray(joins)) {
          joins = [joins];
        }

        // TODO: use appendOption
        this.options.joins = this.options.joins || [];

        joins.forEach(join => {
          if (join.prototype instanceof Model) {
            join = join.query;
          }

          join.options.joinType = type;
          join.setOptions(options);

          this.options.joins.push(join);
        });

        return this;
      }

      leftJoin(queries, options) {
        return this.addJoin('leftJoin', queries, options);
      }

      innerJoin(queries, options) {
        return this.addJoin('innerJoin', queries, options);
      }

      join(queries, options) {
        return this.addJoin('join', queries, options);
      }

      // TODO: require setting `as` when configuring references
      as(as) {
        return this.setOption('as', as);
      }

      // TODO: v2: support multiple fields for `on` via Query.prototpye.appendOption
      // TODO: support raw sql
      on(field) {
        return this.addOption('on', field);
      }

      prepareOn() {
        const join = this;
        const parent = this.parent;
        const joinReferences = join.model.getReferences(parent.model);
        const parentReferences = parent.model.getReferences(join.model);

        if (!parentReferences.length && !joinReferences.length) {
          throw new Query.QueryError(
            `${parent.model.name}: there are no references to \`${
              join.model.name
            }\``
          );
        }

        const isReverseJoin = !!parentReferences.length;
        let references = joinReferences.concat(parentReferences);

        if (this.options.on) {
          const filteredReferences = [];

          for (let field of this.options.on) {
            if (typeof field === 'string') {
              // TODO: join.model.getField(field)
              field = join.model._config._fields[field];
            }
            for (const reference of references) {
              if (reference.from === field || reference.to === field) {
                filteredReferences.push(reference);
              }
            }
          }

          references = filteredReferences;
        }

        const columns = {};

        for (const { from, to } of references) {
          let fromColumn;
          let toColumn;

          if (isReverseJoin) {
            fromColumn = parent.formatColumn(from.column);
            toColumn = join.formatColumn(to.column);
          } else {
            fromColumn = join.formatColumn(from.column);
            toColumn = parent.formatColumn(to.column);
          }

          columns[fromColumn] = toColumn;
        }

        return columns;
      }

      async prepareJoin(sql) {
        const method = this.options.joinType || 'leftJoin';
        sql[method](this.getTable(), this.prepareOn());

        this.ensureFields();
        return this.prepareSql(sql);
      }

      ensureUniqueField(to) {
        if (this.options.fields === false) {
          // if no fields are requested then no need checking for unique fields
          return;
        }

        const aliases = Object.keys(this.options.fields);

        if (to.options.fields === false) {
          // if no fields are requested on the joined query use any field as
          // unique
          this.options.unique = aliases[0];
          return;
        }

        const fields = Object.values(this.options.fields);
        let unique;

        [this.config.primary].concat(this.config.unique).some(field => {
          const index = fields.indexOf(field);
          if (index > -1) {
            unique = aliases[index];
            return true;
          }
          return false;
        });

        if (!unique) {
          throw new Query.QueryError(
            `${this.model.name}: cannot join \`${
              to.model.name
            }\` with no primary or unique fields selected`
          );
        }

        this.options.unique = unique;
      }

      async prepareJoins(sql) {
        return Promise.all(
          this.options.joins.map(async join => {
            this.ensureUniqueField(join);

            join.parent = this;
            // depended on by @knorm/postgres
            join.config.joined = true;
            join.config.index = ++this.config.index;
            // TODO: support custom aliases
            join.config.alias = `${join.config.alias}_${join.config.index}`;
            // propagate the forFetch option to nested joins
            join.config.forFetch = true;

            // TODO: remove
            if (!join.options.as) {
              join.options.as = camelCase(join.model.name);
            }

            return join.prepareJoin(sql);
          })
        );
      }

      ensureFields() {
        super.ensureFields();
      }

      async prepareSql(sql) {
        sql = await super.prepareSql(sql);

        if (this.options.joins) {
          await this.prepareJoins(sql);
        }

        return sql;
      }

      throwFetchRequireError() {
        super.throwFetchRequireError();

        if (this.options.joins) {
          this.options.joins.forEach(join => join.throwFetchRequireError());
        }
      }

      // TODO: strict mode: throw if the value for the unique field is null or undefined
      getParsedRow(row) {
        let parsedRow = super.getParsedRow(row);

        if (!this.options.joins) {
          return parsedRow;
        }

        if (this.options.fields === false) {
          return parsedRow;
        }

        const unique =
          row[this.formatFieldAlias(this.options.unique, { quote: false })];

        if (unique) {
          const uniqueRow = this.parsedRows.get(unique);
          if (uniqueRow) {
            parsedRow = uniqueRow;
          } else {
            this.parsedRows.set(unique, parsedRow);
          }
        }

        return parsedRow;
      }

      parseRow(row) {
        const parsedRow = super.parseRow(row);

        if (this.options.joins) {
          this.options.joins.forEach(join => {
            const as = join.options.as;
            const first = join.options.first;

            const data = join.parseRow(row);
            // the performance of this check could be improved by checking row
            // values while parsing the row but at a cost to code complexity
            const isEmpty = Object.values(data).every(
              // TODO: the array check will also deem empty postgres arrays or
              // JSON arrays as empty/null values. do we want that?
              value => value === null || (isArray(value) && !value.length)
            );

            // TODO: strict mode: warn if joined data replaces already existing
            // fields on the row
            if (isEmpty) {
              parsedRow[as] = first ? null : [];
            } else if (first) {
              if (!parsedRow[as] || !parsedRow[as].knorm) {
                parsedRow[as] = data;
              }
            } else {
              if (!isArray(parsedRow[as])) {
                parsedRow[as] = [];
              }
              parsedRow[as].push(data);
            }
          });
        }

        return parsedRow;
      }

      parseRows(rows) {
        const parsedRows = super.parseRows(rows);

        if (this.options.joins) {
          return Array.from(this.parsedRows.values());
        }

        return parsedRows;
      }
    }

    knorm.updateQuery(RelationsQuery);
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormRelationsError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormRelationsError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
    this.updateField(knorm);
    this.updateQuery(knorm);
  }
}

KnormRelations.KnormRelationsError = class KnormRelationsError extends Knorm.KnormError {};

module.exports = KnormRelations;
