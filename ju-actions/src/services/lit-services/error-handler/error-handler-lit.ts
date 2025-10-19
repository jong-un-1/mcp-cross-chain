// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import { IErrorHandler } from './error-handler.interface';

export class ErrorHandlerLit implements IErrorHandler {
  handle(error: Error): any {
    console.error(error.message);
    console.error(error.stack);
    return Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: error,
      }),
    });
  }
}
