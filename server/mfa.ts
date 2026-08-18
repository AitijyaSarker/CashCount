import crypto from 'crypto';

/**
 * RFC 6238 Time-based One-Time Password (TOTP) Implementation
 * Zero external native dependencies. Uses standard Node.js crypto (HMAC-SHA1).
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class MFAService {
  /**
   * Generates a secure random Base32 encoded secret (160 bits / 20 bytes)
   */
  public static generateSecret(length = 20): string {
    const randomBytes = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < randomBytes.length; i++) {
      secret += BASE32_CHARS[randomBytes[i] % 32];
    }
    return secret;
  }

  /**
   * Decodes Base32 string to Buffer
   */
  private static base32ToBuffer(base32: string): Buffer {
    const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = BASE32_CHARS.indexOf(clean[i]);
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }

  /**
   * Generates TOTP code for a given secret at time step T
   */
  public static generateTOTP(secret: string, timeStepWindow = 30, timeMs = Date.now()): string {
    const key = this.base32ToBuffer(secret);
    const counter = Math.floor(timeMs / 1000 / timeStepWindow);
    
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const strCode = (code % 1000000).toString().padStart(6, '0');
    return strCode;
  }

  /**
   * Verifies 6-digit token against secret allowing 1 step drift before/after (±30s)
   */
  public static verifyToken(secret: string, token: string): boolean {
    if (!token || token.trim().length !== 6) return false;
    const cleanToken = token.trim();
    const now = Date.now();
    const window = 30 * 1000;

    // Check t-1, t, t+1
    for (let delta = -1; delta <= 1; delta++) {
      const expected = this.generateTOTP(secret, 30, now + delta * window);
      if (expected === cleanToken) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates backup / recovery codes
   */
  public static generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Generates standard otpauth:// URI
   */
  public static getOTPAuthURI(email: string, secret: string, issuer = 'FreelanceFinance'): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }
}
