import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

const ADMIN_EMAIL = "joseluis.vides@gmail.com";

// Check if user is admin
app.get("/check", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ isAdmin: false }, 401);
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  
  return c.json({ isAdmin });
});

// Get admin metrics
app.get("/metrics", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const totalUsersResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM user_subscriptions"
  ).first() as any;

  const paidUsersResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM user_subscriptions WHERE status IN ('Pagado', 'Plan Ilimitado')"
  ).first() as any;

  const trialUsersResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'Prueba'"
  ).first() as any;

  const totalProductsResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM products"
  ).first() as any;

  return c.json({
    totalUsers: totalUsersResult.count || 0,
    paidUsers: paidUsersResult.count || 0,
    trialUsers: trialUsersResult.count || 0,
    totalProducts: totalProductsResult.count || 0,
  });
});

// Get all users
app.get("/users", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const usersResult = await c.env.DB.prepare(`
    SELECT 
      u.user_id,
      u.email,
      u.store_name,
      u.phone_number,
      u.country_code,
      u.status,
      u.membership_expiration,
      u.successful_referrals_count,
      u.paid_referrals_count,
      u.is_premium,

      u.has_branding_unlocked,
      u.carousel_enabled,
      u.referred_by,
      u.referral_code,
      u.created_at,
      COUNT(DISTINCT p.id) as products_count,
      (SELECT COUNT(*) FROM user_subscriptions WHERE referred_by = u.referral_code) as total_referrals
    FROM user_subscriptions u
    LEFT JOIN products p ON u.user_id = p.user_id
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
  `).all() as any;

  return c.json({
    users: usersResult.results || [],
  });
});

// Activate 3-month subscription for a user
app.post("/activate-subscription/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  // Get current subscription
  const subscription = await c.env.DB.prepare(
    "SELECT membership_expiration, referred_by, has_made_first_payment FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ error: "User not found" }, 404);
  }

  // Calculate new expiration date
  const now = new Date();
  let newExpiration: Date;

  if (subscription.membership_expiration) {
    const currentExpiration = new Date(subscription.membership_expiration);
    // If current expiration is in the future, add to it
    if (currentExpiration > now) {
      newExpiration = new Date(currentExpiration);
      newExpiration.setDate(newExpiration.getDate() + 90); // Add 90 days
    } else {
      // If expired, start from now
      newExpiration = new Date(now);
      newExpiration.setDate(newExpiration.getDate() + 90);
    }
  } else {
    // No expiration set, start from now
    newExpiration = new Date(now);
    newExpiration.setDate(newExpiration.getDate() + 90);
  }

  // Update subscription
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET status = 'Plan Ilimitado', membership_expiration = ?, has_made_first_payment = 1, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(newExpiration.toISOString(), userId).run();

  console.log(`[ADMIN PAYMENT] Activated subscription for user ${userId}. First payment: ${subscription.has_made_first_payment === 0}`);

  // Check if this is first payment and user was referred
  if (subscription.referred_by && subscription.has_made_first_payment === 0) {
    console.log(`[ADMIN PAYMENT] User was referred by code: ${subscription.referred_by}. Processing referral reward...`);
    
    // Increment referrer's PAID referrals count (the one that counts for rewards)
    const updateResult = await c.env.DB.prepare(
      "UPDATE user_subscriptions SET paid_referrals_count = COALESCE(paid_referrals_count, 0) + 1, updated_at = datetime('now') WHERE referral_code = ?"
    ).bind(subscription.referred_by).run();
    
    console.log(`[ADMIN PAYMENT] Incremented paid_referrals_count for referrer. Success: ${updateResult.success}`);

    // Get referrer's new paid referral count
    const referrer = await c.env.DB.prepare(
      "SELECT user_id, paid_referrals_count, membership_expiration FROM user_subscriptions WHERE referral_code = ?"
    ).bind(subscription.referred_by).first() as any;

    if (referrer) {
      console.log(`[ADMIN PAYMENT] Referrer ${referrer.user_id} now has ${referrer.paid_referrals_count} paid referrals`);

      // Check if referrer reached 3 paid referrals - give them 3 months free
      if (referrer.paid_referrals_count === 3) {
        console.log(`[ADMIN PAYMENT] Referrer reached 3 paid referrals! Granting 3 months free...`);
        
        const referrerNow = new Date();
        let referrerExpiration: Date;

        if (referrer.membership_expiration) {
          const currentExpiration = new Date(referrer.membership_expiration);
          if (currentExpiration > referrerNow) {
            referrerExpiration = new Date(currentExpiration);
            referrerExpiration.setDate(referrerExpiration.getDate() + 90);
          } else {
            referrerExpiration = new Date(referrerNow);
            referrerExpiration.setDate(referrerExpiration.getDate() + 90);
          }
        } else {
          referrerExpiration = new Date(referrerNow);
          referrerExpiration.setDate(referrerExpiration.getDate() + 90);
        }

        await c.env.DB.prepare(
          "UPDATE user_subscriptions SET status = 'Plan Ilimitado', membership_expiration = ?, updated_at = datetime('now') WHERE user_id = ?"
        ).bind(referrerExpiration.toISOString(), referrer.user_id).run();

        console.log(`[ADMIN PAYMENT] Granted 3 months to referrer ${referrer.user_id}. New expiration: ${referrerExpiration.toISOString()}`);
      }
    }
  }

  return c.json({
    success: true,
    newExpirationDate: newExpiration.toISOString(),
  });
});

// Reset trial period for a user
app.post("/reset-trial/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  // Set new trial expiration (7 days from now)
  const newTrialExpiration = new Date();
  newTrialExpiration.setDate(newTrialExpiration.getDate() + 7);

  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET status = 'Prueba', membership_expiration = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(newTrialExpiration.toISOString(), userId).run();

  return c.json({
    success: true,
    newTrialExpiration: newTrialExpiration.toISOString(),
  });
});

// Delete user and all their products
app.delete("/delete-user/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  console.log(`[ADMIN DELETE] Starting deletion process for user ${userId}`);

  try {
    // Delete all associated data in cascade
    
    // 1. Delete products
    await c.env.DB.prepare(
      "DELETE FROM products WHERE user_id = ?"
    ).bind(userId).run();
    console.log(`[ADMIN DELETE] Deleted products`);

    // 2. Delete user categories
    await c.env.DB.prepare(
      "DELETE FROM user_categories WHERE user_id = ?"
    ).bind(userId).run();
    console.log(`[ADMIN DELETE] Deleted categories`);

    // 3. Delete user subscription record (this effectively bans them)
    await c.env.DB.prepare(
      "DELETE FROM user_subscriptions WHERE user_id = ?"
    ).bind(userId).run();
    console.log(`[ADMIN DELETE] Deleted user subscription`);

    console.log(`[ADMIN DELETE] Successfully deleted all data for user ${userId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error(`[ADMIN DELETE ERROR] Failed to delete user ${userId}:`, error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Get payment configuration
app.get("/payment-config", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  console.log('📖 GET /payment-config - Usuario autenticado:', user.email);
  
  const configs = await c.env.DB.prepare(
    "SELECT config_key, config_value FROM admin_config WHERE config_key LIKE 'payment_%'"
  ).all() as any;

  console.log('📖 Registros encontrados en DB:', configs.results?.length || 0);
  
  const paymentConfig: Record<string, string> = {};
  configs.results.forEach((row: any) => {
    paymentConfig[row.config_key] = row.config_value || '';
    if (row.config_key.includes('wompi')) {
      console.log(`📖 Wompi encontrado - ${row.config_key}: ${row.config_value}`);
    }
  });

  console.log('📤 Retornando paymentConfig con keys:', Object.keys(paymentConfig));
  console.log('📤 Wompi link en respuesta:', paymentConfig.payment_wompi_link);
  console.log('📤 Wompi QR en respuesta:', paymentConfig.payment_wompi_qr_url);

  return c.json(paymentConfig);
});

// Update payment configuration
app.post("/payment-config", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const body = await c.req.json();
  console.log('📥 BACKEND - Body completo recibido:', JSON.stringify(body, null, 2));
  
  const { 
    whatsappSupport,
    usdtAddress,
    binanceId,
    usdtQrUrl,
    subscriptionPrice,
    monthlyMaintenance,
    extraOffers,
    brandingPrice,
    wompiQrUrl,
    wompiLink
  } = body;
  
  console.log('🔧 BACKEND - Wompi extraído del body:');
  console.log('  - wompiQrUrl:', wompiQrUrl);
  console.log('  - wompiLink:', wompiLink);
  console.log('  - Tipo wompiQrUrl:', typeof wompiQrUrl);
  console.log('  - Tipo wompiLink:', typeof wompiLink);

  // Update each config value
  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_whatsapp_support'"
  ).bind(whatsappSupport).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_usdt_address'"
  ).bind(usdtAddress).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_binance_id'"
  ).bind(binanceId).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_usdt_qr_url'"
  ).bind(usdtQrUrl).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_subscription_price'"
  ).bind(subscriptionPrice).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_monthly_maintenance'"
  ).bind(monthlyMaintenance).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_extra_offers'"
  ).bind(extraOffers).run();

  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_branding_price'"
  ).bind(brandingPrice).run();

  // Wompi configuration
  console.log('💾 Guardando en DB - wompiQrUrl:', wompiQrUrl || '');
  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_wompi_qr_url'"
  ).bind(wompiQrUrl || '').run();

  console.log('💾 Guardando en DB - wompiLink:', wompiLink || '');
  await c.env.DB.prepare(
    "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_wompi_link'"
  ).bind(wompiLink || '').run();

  console.log('✅ Configuración Wompi guardada exitosamente');
  return c.json({ success: true });
});

// Toggle premium status for a user
app.post("/toggle-premium/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  // Get current premium status
  const subscription = await c.env.DB.prepare(
    "SELECT is_premium FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ error: "User not found" }, 404);
  }

  const currentPremium = subscription.is_premium || 0;
  const newPremium = currentPremium === 1 ? 0 : 1;

  // Toggle premium status
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET is_premium = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(newPremium, userId).run();

  return c.json({
    success: true,
    isPremium: newPremium === 1,
  });
});

// Toggle branding unlock status for a user
app.post("/toggle-branding/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  // Get current branding status
  const subscription = await c.env.DB.prepare(
    "SELECT has_branding_unlocked FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ error: "User not found" }, 404);
  }

  const currentBranding = subscription.has_branding_unlocked || 0;
  const newBranding = currentBranding === 1 ? 0 : 1;

  // Toggle branding status
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET has_branding_unlocked = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(newBranding, userId).run();

  return c.json({
    success: true,
    hasBranding: newBranding === 1,
  });
});

// Toggle carousel unlock status for a user
app.post("/toggle-carousel/:userId", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const userId = c.req.param("userId");

  // Get current carousel status
  const subscription = await c.env.DB.prepare(
    "SELECT carousel_enabled FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ error: "User not found" }, 404);
  }

  const currentCarousel = subscription.carousel_enabled || 0;
  const newCarousel = currentCarousel === 1 ? 0 : 1;

  // Toggle carousel status
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET carousel_enabled = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(newCarousel, userId).run();

  return c.json({
    success: true,
    carouselEnabled: newCarousel === 1,
  });
});

// Public endpoint to get payment configuration (no auth required)
app.get("/public/payment-config", async (c) => {
  const configs = await c.env.DB.prepare(
    "SELECT config_key, config_value FROM admin_config WHERE config_key LIKE 'payment_%'"
  ).all() as any;

  const paymentConfig: Record<string, string> = {};
  configs.results.forEach((row: any) => {
    paymentConfig[row.config_key] = row.config_value || '';
  });

  return c.json(paymentConfig);
});

export default app;
