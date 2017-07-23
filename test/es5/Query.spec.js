const proxyquire = require('proxyquire');

proxyquire('../Query.spec', {
    '../lib/Model': require('../../es5/Model'),
    '../lib/Field': require('../../es5/Field'),
    '../lib/Query': require('../../es5/Query')
});
