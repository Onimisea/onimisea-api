import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class AuthMiddleware implements NestMiddleware {
//   constructor(
//     private readonly jwtService: JwtService,
//     private readonly configService: ConfigService,
//   ) {}

//   use(req: Request, res: Response, next: NextFunction) {
//     const cookies =
//       req.headers.cookie?.split(';').map((cookie) => cookie.trim()) || [];
//     let authToken: string | undefined;

//     for (const cookie of cookies) {
//       const [key, value] = cookie.split('=');
//       if (key === 'authToken') {
//         authToken = value;
//         break;
//       }
//     }

//     if (!authToken) {
//       throw new UnauthorizedException(
//         'Unauthorized. Authentication token is missing.',
//       );
//     }

//     // Verify the authentication token
//     try {
//       const secret = this.configService.get<string>('JWT_SECRET');
//       const decodedToken = this.jwtService.verify(authToken, { secret });
//       req.user = decodedToken;
//       next();
//     } catch (error) {
//       throw new UnauthorizedException(
//         'Unauthorized. Invalid authentication token.',
//       );
//     }
//   }
// }
