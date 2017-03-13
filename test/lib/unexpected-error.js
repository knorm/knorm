const httpErrors = require('httperrors');

module.exports = {
    name: 'unexpected-error',
    installInto: expect => {
        expect.addAssertion(
            '<function> to be an error named <string>',
            (expect, TheError, name) => {
                const error = new TheError();
                return expect(error, 'to satisfy', {
                    name,
                    [name]: true,
                });
            }
        );

        expect.addAssertion(
            '<function> to be an error that extends <string|number|function>',
            (expect, TheError, TheParent) => {
                if (typeof TheParent === 'string' || typeof TheParent === 'number') {
                    TheParent = httpErrors[TheParent];
                }

                const error = new TheError();
                const parent = new TheParent();
                return expect(error, 'to satisfy', {
                    [parent.name]: true,
                });
            }
        );
    },
};
