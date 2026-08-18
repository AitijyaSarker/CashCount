import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database, UserRecord } from './db.ts';
import { findUserByIdMongo } from './db_mongo.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'freelance_finance_jwt_super_secure_secret_key_32_bytes';
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export class AuthService {
  /**
   * Generates JWT token with user claims
   */
  public static signToken(user: UserRecord, isMfaPending = false): string {
    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.full_name,
      businessName: user.business_name,
      mfaPending: isMfaPending,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: isMfaPending ? '10m' : JWT_EXPIRES_IN });
  }

  /**
   * Verifies JWT token
   */
  public static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  /**
   * Sets secure HTTP-only cookie
   */
  public static setAuthCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Clears auth cookie
   */
  public static clearAuthCookie(res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
}

/**
 * Express Middleware: Requires Valid Authentication
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization Header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // 2. Check Cookie if header not present
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in.',
      });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session expired or invalid token. Please log in again.',
      });
    }

    // Check if MFA verification is still pending
    if (decoded.mfaPending) {
      return res.status(403).json({
        error: 'MFA_REQUIRED',
        message: 'Two-Factor Authentication code verification required.',
      });
    }

    const user = await findUserByIdMongo(decoded.sub);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}
