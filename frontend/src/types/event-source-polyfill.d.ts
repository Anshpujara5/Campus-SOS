declare module "event-source-polyfill" {
  export class EventSourcePolyfill extends EventSource {
    constructor(
      url: string,
      eventSourceInitDict?: {
        withCredentials?: boolean;
        headers?: Record<string, string>;
        proxy?: string;
        https?: unknown;
      }
    );
  }
  export const NativeEventSource: typeof EventSource;
}
