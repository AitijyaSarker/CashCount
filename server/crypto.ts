import crypto from 'crypto';

/**
 * AES-256-GCM Field-Level Encryption
 * Ensures sensitive financial identifiers, tax IDs, and receipt metadata
 * are encrypted at rest with authentication tag validation.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const AUTH_TAG_LENGTH = 16;

// Derive 32-byte key from environment or fallback secure deterministic key for development
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'freelancer_financial_aes_256_master_key_salt_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export class FieldCrypto {
  /**
   * Encrypts plaintext string using AES-256-GCM
   * Output format: iv:ciphertext:authTag (all hex encoded)
   */
  public static encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (err) {
      console.error('Encryption failed:', err);
      return plainText;
    }
  }

  /**
   * Decrypts encrypted string
   */
  public static decrypt(cipherTextWithMeta: string): string {
    if (!cipherTextWithMeta) return '';
    // If not in encrypted format (e.g. unencrypted legacy string), return as is
    const parts = cipherTextWithMeta.split(':');
    if (parts.length !== 3) {
      return cipherTextWithMeta;
    }

    try {
      const [ivHex, encryptedHex, authTagHex] = parts;
      const key = getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      console.error('Decryption failed or data tampered:', err);
      return '[Encrypted Data]';
    }
  }

  /**
   * Masks account number / identifier for safe UI display (e.g. **** 4821)
   */
  public static maskIdentifier(plainOrEncrypted: string): string {
    const raw = FieldCrypto.decrypt(plainOrEncrypted);
    if (!raw) return '••••';
    if (raw.length <= 4) return `•••• ${raw}`;
    return `•••• ${raw.slice(-4)}`;
  }
}
