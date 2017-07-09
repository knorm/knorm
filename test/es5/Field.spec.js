const proxyquire = require('proxyquire');

proxyquire('../Field.spec', {
    '../lib/Field': require('../../es5/Field'),
    '../lib/Model': require('../../es5/Model')
});
