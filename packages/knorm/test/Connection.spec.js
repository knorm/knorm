import { Knorm } from '../src/Knorm';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('Connection', function () {
  let Connection;
  let ConnectionError;

  before(function () {
    const knorm = new Knorm();

    Connection = knorm.Connection;
    ConnectionError = Connection.ConnectionError;
  });

  describe('Connection.prototype.create', function () {
    it('throws if not overridden', async function () {
      const connection = new Connection();
      await expect(
        () => connection.create(),
        'to throw',
        new ConnectionError('`Connection.prototype.create` is not implemented')
      );
    });
  });

  describe('Connection.prototype.query', function () {
    it('throws if not overridden', async function () {
      const connection = new Connection();
      await expect(
        () => connection.query(),
        'to throw',
        new ConnectionError('`Connection.prototype.query` is not implemented')
      );
    });
  });

  describe('Connection.prototype.close', function () {
    it('throws if not overridden', async function () {
      const connection = new Connection();
      await expect(
        () => connection.close(),
        'to throw',
        new ConnectionError('`Connection.prototype.close` is not implemented')
      );
    });
  });
});
