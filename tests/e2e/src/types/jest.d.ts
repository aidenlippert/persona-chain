declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTxHash(): R;
      toBeValidDID(): R;
    }
  }
}

export {};