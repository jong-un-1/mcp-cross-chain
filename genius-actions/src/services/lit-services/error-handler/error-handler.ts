import { IErrorHandler } from './error-handler.interface';

export class ErrorHandler implements IErrorHandler {
  handle(error: Error): void {
    console.error(error);
    throw error;
  }
}
