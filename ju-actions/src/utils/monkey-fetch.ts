// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

/**
 * Monkey patches the fetch API to log all requests
 * Logs the method, full URL, and body parameters
 */
export function monkeyPatchFetch() {
  // Store the original fetch function
  const originalFetch = globalThis.fetch;

  let fetchCounter = 0;

  // Replace with our instrumented version
  globalThis.fetch = async function (input, init) {
    fetchCounter++;

    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';

    let bodyParams = 'No body';
    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          bodyParams = JSON.parse(init.body);
        } else {
          bodyParams = init.body;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        bodyParams = init.body;
      }
    }

    console.log(`[Fetch Request] Counter: ${fetchCounter}`);
    console.log(`[Fetch Request] Method: ${method}, URL: ${url}`);
    console.log(`[Fetch Request] Body:`, bodyParams);

    // eslint-disable-next-line prefer-rest-params
    return originalFetch.apply(this, arguments);
  };

  console.log('Fetch API has been monkey patched to log all requests');
}

monkeyPatchFetch();
