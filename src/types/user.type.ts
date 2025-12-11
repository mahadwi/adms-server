export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  jti: string;
  iat?: number;
  exp?: number;
}
