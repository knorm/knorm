const Field = require('./lib/Field');
const Virtual = require('./lib/Virtual');

class Model {
    static get references() {
        createReferences(this);
        return this._references;
    }

    static get referenced() {
        createReferenced(this);
        return this._referenced;
    }

    static get fields() {
        createFields(this);
        return this._fields;
    }

    static set fields(fields) {
        createFields(this);
        addFields(this, fields);
    }

    static get virtuals() {
        createVirtuals(this);
        return this._virtuals;
    }

    static set virtuals(virtuals) {
        createVirtuals(this);
        addVirtuals(this, virtuals);
    }

    constructor(data = {}) {
        this._getVirtualNames().forEach(name => {
            if (this[name] !== undefined) {
                throw new Error(
                    `virtual-name '${this.constructor.name}.${name}' is a reserved instance property name`
                );
            }

            const virtual = this.constructor.virtuals[name];
            let { get, set } = virtual;

            if (get) { get = get.bind(this); }
            if (set) { set = set.bind(this); }

            Object.defineProperty(this, name, {
                get,
                set,
                enumerable: true
            });
        });

        this.setData(data);
    }

    _getFieldNames() {
        return Object.keys(this.constructor.fields);
    }

    _getVirtualNames() {
        return Object.keys(this.constructor.virtuals);
    }

    setDefaults({ fields } = {}) {
        fields = fields || [];
        fields = fields.length ? fields : this._getFieldNames();

        fields.forEach(name => {
            if (this[name] === undefined) {
                const field = this.constructor.fields[name];
                if (!field) {
                    throw new Error(
                        `cannot set default value for unknown field '${this.constructor.name}.${name}'`
                    );
                }
                if (field.hasDefault()) {
                    this[name] = field.getDefault(this);
                }
            }
        });

        return this;
    }

    setData(data) {
        Object.keys(data).forEach(name => {
            const value = data[name];
            const field = this.constructor.fields[name];

            if (field) {
                this[name] = value;
            } else {
                const virtual = this.constructor.virtuals[name];
                if (!virtual) {
                    throw new Error(`cannot set data for unknown field or virtual '${this.constructor.name}.${name}'`);
                }
                if (!virtual.hasSetter) {
                    throw new Error(
                        `virtual '${this.constructor.name}.${name}' has no setter`
                    );
                }
                this[name] = value;
            }
        });

        return this;
    }

    async getData({ fields, virtuals } = {}) {
        fields = fields || [];
        fields = fields.length ? fields : this._getFieldNames();

        const data = fields.reduce((data, name) => {
            if (!this.constructor.fields[name]) {
                throw new Error(`cannot get data for unknown field '${this.constructor.name}.${name}'`);
            }
            const value = this[name];
            if (value !== undefined) {
                data[name] = value;
            }
            return data;
        }, {});

        if (virtuals) {
            if (!Array.isArray(virtuals) || !virtuals.length) {
                virtuals = this._getVirtualNames().filter(name => {
                    return !!this.constructor.virtuals[name].get;
                });
            }
            const virtualsData = await Promise.all(
                virtuals.map(async name => {
                    const virtual = this.constructor.virtuals[name];
                    if (!virtual.get) {
                        throw new Error(
                            `virtual '${this.constructor.name}.${name}' has no getter`
                        );
                    }
                    return virtual.get.call(this);
                })
            );
            virtuals.forEach((name, index) => {
                data[name] = virtualsData[index];
            });
        }

        return data;
    }

    async validate({ fields } = {}) {
        fields = fields || [];
        fields = fields.length ? fields : this._getFieldNames();

        await Promise.all(fields.map(name => {
            const field = this.constructor.fields[name];
            if (!field) {
                throw new Error(`cannot validate unknown field '${this.constructor.name}.${name}'`);
            }
            const value = this[name];
            return field.validate(value, this);
        }));

        return this;
    }
}

const createReferences = model => {
    if (!model._references) {
        Object.defineProperty(model, '_references', { value: {} });
    }
};

const createReferenced = model => {
    if (!model._referenced) {
        Object.defineProperty(model, '_referenced', { value: {} });
    }
};

const createFields = model => {
    if (!model._fields) {
        Object.defineProperty(model, '_fields', {
            value: {},
            writable: true
        });

        Object.defineProperty(model, '_fieldsClassName', {
            value: model.name,
            writable: true
        });
    }

    if (model._fieldsClassName !== model.name) {
        model._fields = Object.values(model._fields).reduce((fields, field) => {
            fields[field.name] = field.clone().setModel(model);
            return fields;
        }, {});
        model._fieldsClassName = model.name;
    }
};

const addFields = (model, fields) => {
    Object.keys(fields).forEach(name => {
        const fieldConfig = Object.assign({ name, model }, fields[name]);
        const field = new Field(fieldConfig);

        model._fields[name] = field;
    });
};

const createVirtuals = model => {
    if (!model._virtuals) {
        Object.defineProperty(model, '_virtuals', { value: {} });
    }
};

const addVirtuals = (model, virtuals) => {
    Object.keys(virtuals).forEach(name  => {
        const descriptor = virtuals[name];

        model._virtuals[name] = new Virtual({
            name,
            model,
            descriptor
        });
    });
};

module.exports = Model;
