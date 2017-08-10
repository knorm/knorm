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

    it('sets the error message if passed a string', () => {
      expect(new KnormError('foo bar'), 'to satisfy', {
        message: 'foo bar'
      });
    });

    describe('when passed another error instance', () => {
      it("sets the error message from the instance's message", () => {
        const error = new Error('foo bar');
        expect(new KnormError(error), 'to satisfy', {
          message: 'foo bar'
        });
      });

      it('stores the passed error as `originalError`', () => {
        const error = new Error('foo bar');
        expect(new KnormError(error), 'to satisfy', {
          originalError: new Error('foo bar')
        });
      });
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
