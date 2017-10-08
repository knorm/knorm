const expect = require('unexpected').clone();
const KnormError = require('../lib/KnormError');

describe('KnormError', () => {
  it('extends Error', () => {
    expect(KnormError.prototype, 'to be an', Error);
  });

  describe('when instances are created', () => {
    it('sets the error name to KnormError', () => {
      expect(new KnormError().name, 'to be', 'KnormError');
    });

    it('captures the stack trace', () => {
      expect(new KnormError().stack, 'to be a string');
    });

    describe('without Error.captureStackTrace', () => {
      let captureStackTrace;

      before(() => {
        captureStackTrace = Error.captureStackTrace;
        Error.captureStackTrace = undefined;
      });

      after(() => {
        Error.captureStackTrace = captureStackTrace;
      });

      it('captures a stack trace', () => {
        expect(new KnormError().stack, 'to be a string');
      });
    });
  });
});
