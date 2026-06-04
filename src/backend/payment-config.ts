import { Context } from 'hono';
import { z } from 'zod';

const PaymentConfigSchema = z.object({
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankHolder: z.string().optional(),
  usdtAddress: z.string().optional(),
  binanceId: z.string().optional(),
  qrUrl: z.string().optional(),
});

export async function getPaymentConfig(c: Context) {
  try {
    const db = c.env.DB;
    
    const configs = await db.prepare(`
      SELECT config_key, config_value 
      FROM admin_config 
      WHERE config_key LIKE 'payment_%'
    `).all();

    const paymentConfig = {
      bankName: '',
      bankAccount: '',
      bankHolder: '',
      usdtAddress: '',
      binanceId: '',
      qrUrl: '',
    };

    for (const row of configs.results) {
      const key = row.config_key.replace('payment_', '');
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      paymentConfig[camelKey as keyof typeof paymentConfig] = row.config_value || '';
    }

    return c.json(paymentConfig);
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return c.json({ error: 'Failed to fetch payment configuration' }, 500);
  }
}

export async function updatePaymentConfig(c: Context) {
  try {
    const body = await c.req.json();
    const data = PaymentConfigSchema.parse(body);
    const db = c.env.DB;

    const updates: { key: string; value: string }[] = [];
    
    if (data.bankName !== undefined) updates.push({ key: 'payment_bank_name', value: data.bankName });
    if (data.bankAccount !== undefined) updates.push({ key: 'payment_bank_account', value: data.bankAccount });
    if (data.bankHolder !== undefined) updates.push({ key: 'payment_bank_holder', value: data.bankHolder });
    if (data.usdtAddress !== undefined) updates.push({ key: 'payment_usdt_address', value: data.usdtAddress });
    if (data.binanceId !== undefined) updates.push({ key: 'payment_binance_id', value: data.binanceId });
    if (data.qrUrl !== undefined) updates.push({ key: 'payment_qr_url', value: data.qrUrl });

    for (const update of updates) {
      await db.prepare(`
        INSERT INTO admin_config (config_key, config_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(config_key) 
        DO UPDATE SET config_value = excluded.config_value, updated_at = CURRENT_TIMESTAMP
      `).bind(update.key, update.value).run();
    }

    return c.json({ success: true, message: 'Payment configuration updated' });
  } catch (error) {
    console.error('Error updating payment config:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to update payment configuration' }, 500);
  }
}
