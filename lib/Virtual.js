class Virtual {
    constructor({ model, name, descriptor }) {
        this.name = name;

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
            this.get = descriptor.get;
            this.hasGetter = true;
        }

        if (descriptor.set) {
            if (typeof descriptor.set !== 'function') {
                throw new Error(
                    `setter for '${model.name}.${name}' virtual is not a function`
                );
            }
            this.set = descriptor.set;
            this.hasSetter = true;
        }
    }
}

module.exports = Virtual;
