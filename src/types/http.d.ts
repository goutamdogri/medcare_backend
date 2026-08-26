declare module 'http' {
  interface IncomingMessage {
    /** Correlation id assigned by pino-http to every request. */
    id?: string;
  }
}

export {};
