import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_jwt_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

