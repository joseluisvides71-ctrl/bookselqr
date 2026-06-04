import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get payment configuration (public)
app.get("/config", async (c) => {
  const configs = await c.env.DB.prepare(
    "SELECT config_key, config_value FROM admin_config WHERE config_key IN ('payment_usdt_address', 'payment_binance_id', 'payment_usdt_qr_url', 'payment_whatsapp_support', 'payment_subscription_price', 'payment_branding_price', 'payment_extra_offers', 'payment_wompi_qr_url', 'payment_wompi_link')"
  ).all() as any;

  const paymentConfig: Record<string, string> = {};
  configs.results.forEach((row: any) => {
    paymentConfig[row.config_key] = row.config_value || '';
  });

  return c.json(paymentConfig);
});

// Submit payment verification
app.post("/verify", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const formData = await c.req.formData();
  const paymentMethod = formData.get('paymentMethod') as string;
  const receiptFile = formData.get('receipt') as File;

  if (!paymentMethod || !receiptFile) {
    return c.json({ error: "Payment method and receipt are required" }, 400);
  }

  // Upload receipt to R2
  const fileExtension = receiptFile.name.split('.').pop();
  const fileName = `payment-receipts/${user.id}-${Date.now()}.${fileExtension}`;
  
  await c.env.R2_BUCKET.put(fileName, receiptFile.stream(), {
    httpMetadata: {
      contentType: receiptFile.type,
    },
  });

  const receiptUrl = `https://pub-75f2eb96f92f4cd5b58ec0c0c2cb5d4f.r2.dev/${fileName}`;

  // Receipt uploaded to R2 - no database storage needed
  // Payment notification will be sent via WhatsApp

  return c.json({
    success: true,
    receiptUrl,
  });
});

// Payment verifications removed - payments tracked via WhatsApp only
app.get("/my-verifications", authMiddleware, async (c) => {
  return c.json({
    verifications: [],
  });
});

export default app;
