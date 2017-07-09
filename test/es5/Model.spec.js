const proxyquire = require('proxyquire');

proxyquire('../Model.spec', {
    '../lib/Model': require('../../es5/Model'),
    '../lib/Field': require('../../es5/Field'),
    '../lib/Virtual': require('../../es5/Virtual'),
    '../lib/Query': require('../../es5/Query')
});
