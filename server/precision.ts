/**
 * Precision Decimal & Financial Arithmetic Helpers
 * Eliminates IEEE-754 floating point imprecision in currency calculations.
 */

export class DecimalMath {
  // Scale factor for 4 decimal places (10000)
  private static readonly SCALE = 10000;

  /**
   * Converts a number or string to a scaled integer representation
   */
  public static toInternal(val: number | string): number {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 0;
    return Math.round(num * DecimalMath.SCALE);
  }

  /**
   * Converts scaled integer back to rounded standard float
   */
  public static fromInternal(val: number): number {
    return val / DecimalMath.SCALE;
  }

  /**
   * Adds two monetary amounts safely
   */
  public static add(a: number | string, b: number | string): number {
    const intA = DecimalMath.toInternal(a);
    const intB = DecimalMath.toInternal(b);
    return DecimalMath.fromInternal(intA + intB);
  }

  /**
   * Subtracts b from a safely: (a - b)
   */
  public static subtract(a: number | string, b: number | string): number {
    const intA = DecimalMath.toInternal(a);
    const intB = DecimalMath.toInternal(b);
    return DecimalMath.fromInternal(intA - intB);
  }

  /**
   * Multiplies an amount by a factor (e.g. rate or percentage)
   */
  public static multiply(amount: number | string, factor: number | string): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const numFactor = typeof factor === 'string' ? parseFloat(factor) : factor;
    return Math.round(numAmount * numFactor * 10000) / 10000;
  }

  /**
   * Formats a financial number with 2 decimal places and commas
   */
  public static formatCurrency(amount: number | string, currency = 'USD'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Estimates payment rail processing fees based on platform standard formulas
   */
  public static calculateRailFee(
    platform: string,
    grossAmount: number,
    isCrossBorder = false
  ): { fee: number; net: number } {
    let fee = 0;
    const platformUpper = platform.toUpperCase();

    if (platformUpper.includes('STRIPE')) {
      // Standard US Stripe: 2.9% + $0.30
      const percentageFee = grossAmount * (isCrossBorder ? 0.039 : 0.029);
      fee = percentageFee + 0.30;
    } else if (platformUpper.includes('PAYONEER')) {
      // Payoneer: ~2.0% standard receiving fee or $3 flat bank withdrawal
      fee = grossAmount * 0.02;
      if (fee < 1.50 && grossAmount > 0) fee = 1.50; // min fee
    } else if (platformUpper.includes('DOT')) {
      // Dot Invoicing / ACH rail: 1.5% capped at $15
      fee = Math.min(grossAmount * 0.015, 15.00);
    } else if (platformUpper.includes('WISE')) {
      // Wise wire / multi-currency: ~0.45% + $0.40
      fee = grossAmount * 0.0045 + 0.40;
    } else if (platformUpper.includes('PAYPAL')) {
      // PayPal Goods & Services: 3.49% + $0.49
      fee = grossAmount * 0.0349 + 0.49;
    } else {
      // Direct Bank / Cash
      fee = 0;
    }

    const roundedFee = Math.round(fee * 100) / 100;
    const net = DecimalMath.subtract(grossAmount, roundedFee);
    return { fee: roundedFee, net: Math.max(0, net) };
  }
}
