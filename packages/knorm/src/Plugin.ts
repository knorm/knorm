import { Knorm } from './Knorm';

/**
 * A Knorm plugin.
 */
export abstract class Plugin {
  /**
   * Initializes a plugin.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  abstract init(knorm: Knorm): Plugin;
  /**
   * Updates a {@link Knorm} instance's {@link Model class}.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  uploadModel?(knorm: Knorm): Plugin;
  /**
   * Updates a {@link Knorm} instance's {@link Query class}.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  uploadQuery?(knorm: Knorm): Plugin;
  /**
   * Updates a {@link Knorm} instance's {@link Transaction class}.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  uploadTransaction?(knorm: Knorm): Plugin;
  /**
   * Updates a {@link Knorm} instance's {@link Connection class}.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  uploadConnection?(knorm: Knorm): Plugin;
  /**
   * Updates a {@link Knorm} instance's {@link Field class}.
   *
   * @param {Knorm} knorm The ORM instance.
   *
   * @returns {Plugin} The same {@link Plugin} instance.
   */
  uploadField?(knorm: Knorm): Plugin;
}
