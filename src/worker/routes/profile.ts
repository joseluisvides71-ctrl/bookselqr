import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

app.get("/status", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const subscription = await c.env.DB.prepare(
    "SELECT phone_number, country_code, store_name FROM user_subscriptions WHERE user_id = ?"
  ).bind(user.id).first() as any;

  if (!subscription) {
    return c.json({ 
      hasCompletedProfile: false,
      whatsappConfigured: false 
    });
  }

  // Check if WhatsApp is configured (phone_number exists and is not empty)
  const whatsappConfigured = !!(subscription.phone_number && subscription.phone_number.trim() !== '');
  
  // Check if profile is complete (has store_name)
  const hasCompletedProfile = !!(subscription.store_name && subscription.store_name.trim() !== '');

  return c.json({
    hasCompletedProfile,
    whatsappConfigured
  });
});

app.post("/update-social-media", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { instagram_url, facebook_url, tiktok_url } = await c.req.json();

  console.log('[BACKEND] Updating social media for user:', user.id);
  console.log('[BACKEND] Received data:', { instagram_url, facebook_url, tiktok_url });

  // Validate URLs if provided
  const validateUrl = (url: string | null) => {
    if (!url || url.trim() === '') return null;
    const trimmed = url.trim();
    // Basic URL validation - must start with http:// or https://
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  const validatedInstagram = validateUrl(instagram_url);
  const validatedFacebook = validateUrl(facebook_url);
  const validatedTiktok = validateUrl(tiktok_url);

  console.log('[BACKEND] Validated URLs:', { validatedInstagram, validatedFacebook, validatedTiktok });

  const result = await c.env.DB.prepare(
    `UPDATE user_subscriptions 
     SET instagram_url = ?, facebook_url = ?, tiktok_url = ?, updated_at = datetime('now') 
     WHERE user_id = ?`
  ).bind(validatedInstagram, validatedFacebook, validatedTiktok, user.id).run();

  console.log('[BACKEND] Update result:', result);

  return c.json({ success: true });
});

app.post("/update-whatsapp", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { phoneNumber, countryCode } = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE user_subscriptions 
     SET phone_number = ?, country_code = ?, updated_at = datetime('now') 
     WHERE user_id = ?`
  ).bind(phoneNumber, countryCode, user.id).run();

  return c.json({ success: true });
});

app.post("/update-store-name", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { storeName } = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE user_subscriptions 
     SET store_name = ?, updated_at = datetime('now') 
     WHERE user_id = ?`
  ).bind(storeName, user.id).run();

  return c.json({ success: true });
});

app.post("/update-slogan", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { slogan } = await c.req.json();

  // Validate slogan length (max 80 characters)
  if (slogan && slogan.length > 80) {
    return c.json({ error: "El eslogan no puede tener más de 80 caracteres" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE user_subscriptions 
     SET slogan = ?, updated_at = datetime('now') 
     WHERE user_id = ?`
  ).bind(slogan || null, user.id).run();

  return c.json({ success: true });
});

app.post("/complete", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { storeName, phoneNumber, countryCode, referredBy } = await c.req.json();

  console.log('[REFERRAL BACKEND] User ID:', user.id);
  console.log('[REFERRAL BACKEND] Received referredBy:', referredBy);
  console.log('[REFERRAL BACKEND] Store Name:', storeName);

  // Validate required fields
  if (!storeName || !phoneNumber || !countryCode) {
    return c.json({ error: "Faltan campos requeridos" }, 400);
  }

  let wasReferred = false;

  // Handle referral if referredBy is provided and not null/empty
  if (referredBy && referredBy.trim() !== '') {
    console.log('[REFERRAL BACKEND] Processing referral code:', referredBy);
    
    const referrer = await c.env.DB.prepare(
      "SELECT user_id, referral_code FROM user_subscriptions WHERE referral_code = ?"
    ).bind(referredBy).first() as any;

    console.log('[REFERRAL BACKEND] Referrer lookup result:', referrer);

    if (referrer && referrer.user_id !== user.id) {
      console.log('[REFERRAL BACKEND] Valid referrer found, saving...');
      
      const updateResult = await c.env.DB.prepare(
        `UPDATE user_subscriptions 
         SET referred_by = ?, updated_at = datetime('now') 
         WHERE user_id = ?`
      ).bind(referredBy, user.id).run();

      console.log('[REFERRAL BACKEND] Update result:', updateResult);

      await c.env.DB.prepare(
        "INSERT INTO referrals_log (referrer_id, referred_user_id, referral_code) VALUES (?, ?, ?)"
      ).bind(referrer.user_id, user.id, referredBy).run();

      wasReferred = true;
      console.log('[REFERRAL BACKEND] Referral saved successfully');
    } else {
      console.log('[REFERRAL BACKEND] Invalid referrer or self-referral');
    }
  } else {
    console.log('[REFERRAL BACKEND] No referral code provided or empty string');
  }

  // Update profile with essential fields only
  await c.env.DB.prepare(
    `UPDATE user_subscriptions 
     SET store_name = ?, phone_number = ?, country_code = ?, has_completed_profile = 1, whatsapp_configured = 1, updated_at = datetime('now') 
     WHERE user_id = ?`
  ).bind(storeName, phoneNumber, countryCode, user.id).run();

  return c.json({ success: true, wasReferred });
});

export default app;
