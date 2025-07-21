import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      userId?: string;
      did?: string;
    }
  }
}

declare module 'circomlib' {
  export function poseidon(inputs: any[]): any;
}

declare module '@digitalbazaar/ed25519-signature-2020' {
  export class Ed25519Signature2020 {
    constructor(options: any);
  }
}

declare module '@digitalbazaar/ed25519-verification-key-2020' {
  export class Ed25519VerificationKey2020 {
    static generate(): Promise<any>;
    constructor(options: any);
  }
}