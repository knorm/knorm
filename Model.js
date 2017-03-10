const Field = require('./Field');

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
                    `virtual name '${this.constructor.name}.${name}' is a reserved instance property name`
                );
            }

            let { get, set } = this.constructor.virtuals[name];

            if (get) {
                get = get.bind(this);
            }
            if (set) {
                set = set.bind(this);
            }

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
                        `cannot set default value for unknown field '${name}'`
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
                if (virtual) {
                    if (virtual.set) {
                        virtual.set.call(this, value);
                    } else {
                        throw new Error(
                            `virtual '${this.constructor.name}.${name}' has no setter`
                        );
                    }
                } else {
                    throw new Error(`cannot populate unknown field '${name}'`);
                }
            }
        });

        return this;
    }

    async getData({ fields, virtuals } = {}) {
        fields = fields || [];
        fields = fields.length ? fields : this._getFieldNames();

        const data = fields.reduce((data, name) => {
            if (!this.constructor.fields[name]) {
                throw new Error(`cannot get data for unknown field '${name}'`);
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
                throw new Error(`cannot validate unknown field '${name}'`);
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

        Object.defineProperty(model, '_fieldsModel', {
            writable: true,
            value: model.name
        });
    }

    if (model._fieldsModel !== model.name) {
        const fields = model._fields;
        model._fields = {};
        Object.values(fields).forEach(field => {
            const clone = field.clone();
            clone.setModel(model);
            model._fields[clone.name] = clone;
        });
        model._fieldsModel = model.name;
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
        let descriptor = virtuals[name];

        if (typeof descriptor === 'function') {
            descriptor = {
                get: descriptor
            };
        }

        if (!descriptor.get && !descriptor.set) {
            throw new Error(
                `virtual '${model.name}.${name}' has no setter or getter`
            );
        }

        if (descriptor.get) {
            if (typeof descriptor.get !== 'function') {
                throw new Error(
                    `getter for '${model.name}.${name}' virtual is not a function`
                );
            }
        }
        if (descriptor.set) {
            if (typeof descriptor.set !== 'function') {
                throw new Error(
                    `setter for '${model.name}.${name}' virtual is not a function`
                );
            }
        }

        model._virtuals[name] = descriptor;
    });
};

module.exports = Model;
