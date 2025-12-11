declare namespace Express {
  interface Request {
    user?: {
      sub: number;
      email: string;
      role: string;
    };
    device?: import('generated/prisma').Device;
    query?: import('src/types/iclock.type').QueryParams;
    body?: ReadableStream<Uint8Array<ArrayBuffer>> | null;
  }
}
