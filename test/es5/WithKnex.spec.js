const proxyquire = require('proxyquire');

proxyquire('../WithKnex.spec', {
    '../lib/WithKnex': require('../../es5/WithKnex')
});
