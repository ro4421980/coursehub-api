/**
 * Base class for errors that belong to the application/business layer.
 *
 * Use cases throw these errors instead of HTTP exceptions so the business
 * rule can be read and tested without importing NestJS or Express. The
 * global exception filter is the only place that translates the `code` into
 * an HTTP status code.
 */
export abstract class ApplicationError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
