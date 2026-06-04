import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get full subscription data for profile page
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const subscription = await c.env.DB.prepare(
    `SELECT 
      u.*,
      (SELECT COUNT(*) FROM user_subscriptions WHERE referred_by = u.referral_code) as total_referrals
     FROM user_subscriptions u 
     WHERE u.user_id = ?`
  ).bind(user.id).first() as any;

  // SECURITY VALIDATION: If subscription not found, user was deleted
  if (!subscription) {
    console.log(`[SECURITY] Blocked subscription access - user deleted: ${user.id}`);
    return c.json({ 
      error: 'Esta cuenta ya no existe o ha sido dada de baja',
      errorCode: 'ACCOUNT_DELETED'
    }, 403);
  }

  // Generate referral code if not exists (for existing users)
  if (!subscription.referral_code) {
    const referralCode = user.id.substring(0, 8).toUpperCase();
    await c.env.DB.prepare(
      "UPDATE user_subscriptions SET referral_code = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).bind(referralCode, user.id).run();
    subscription.referral_code = referralCode;
  }

  // Check and auto-deactivate expired services
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let needsUpdate = false;
  const updates: string[] = [];

  // Check membership expiration
  if (subscription.membership_expiration) {
    const expirationDate = new Date(subscription.membership_expiration);
    expirationDate.setHours(0, 0, 0, 0);
    if (expirationDate < now && subscription.status !== 'Prueba') {
      updates.push("status = 'Prueba'");
      needsUpdate = true;
    }
  }

  // Check branding expiration
  if (subscription.branding_expiration) {
    const expirationDate = new Date(subscription.branding_expiration);
    expirationDate.setHours(0, 0, 0, 0);
    if (expirationDate < now && subscription.has_branding_unlocked === 1) {
      updates.push("has_branding_unlocked = 0");
      needsUpdate = true;
    }
  }

  // Apply updates if needed
  if (needsUpdate && updates.length > 0) {
    await c.env.DB.prepare(
      `UPDATE user_subscriptions SET ${updates.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(user.id).run();

    // Refresh subscription data
    const updatedSubscription = await c.env.DB.prepare(
      "SELECT * FROM user_subscriptions WHERE user_id = ?"
    ).bind(user.id).first() as any;

    if (updatedSubscription) {
      subscription.status = updatedSubscription.status;
      subscription.has_branding_unlocked = updatedSubscription.has_branding_unlocked;
    }
  }

  return c.json({
    referral_code: subscription.referral_code,
    successful_referrals_count: subscription.successful_referrals_count || 0,
    total_referrals: subscription.total_referrals || 0,
    phone_number: subscription.phone_number,
    country_code: subscription.country_code,
    store_name: subscription.store_name,
    membership_expiration: subscription.membership_expiration,
    branding_expiration: subscription.branding_expiration,
    offers_expiration: subscription.offers_expiration,
    status: subscription.status || 'Prueba',
    is_premium: subscription.is_premium || false,
    has_branding_unlocked: subscription.has_branding_unlocked || 0,
    logo_url: subscription.logo_url || null,

    slogan: subscription.slogan || null,
    instagram_url: subscription.instagram_url || null,
    facebook_url: subscription.facebook_url || null,
    tiktok_url: subscription.tiktok_url || null,
  });
});

app.get("/status", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const subscription = await c.env.DB.prepare(
    "SELECT * FROM user_subscriptions WHERE user_id = ?"
  ).bind(user.id).first() as any;

  if (!subscription) {
    return c.json({ error: "Subscription not found" }, 404);
  }

  // Count actual products from products table for accuracy
  const productCountResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM products WHERE user_id = ?"
  ).bind(user.id).first() as any;
  
  const actualProductsCount = productCountResult?.count || 0;

  const trialStartDate = new Date(subscription.trial_started_at);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const trialDaysRemaining = Math.max(0, 7 - daysElapsed);
  const isTrialExpired = daysElapsed >= 7;
  const productsRemaining = Math.max(0, 5 - actualProductsCount);
  
  // Check membership expiration
  let isMembershipExpired = false;
  let membershipStatus: 'trial' | 'active' | 'expired' = 'trial';
  
  if (subscription.membership_expiration) {
    const expirationDate = new Date(subscription.membership_expiration);
    isMembershipExpired = now > expirationDate;
    
    if (isMembershipExpired) {
      membershipStatus = 'expired';
    } else {
      membershipStatus = 'active';
    }
  } else if (subscription.status === 'Pagado') {
    // Legacy paid users without expiration date - treat as active
    membershipStatus = 'active';
  } else {
    membershipStatus = 'trial';
  }
  
  // Determine if user can generate
  const canGenerate = 
    (membershipStatus === 'active' && !isMembershipExpired) ||
    (membershipStatus === 'trial' && !isTrialExpired && actualProductsCount < 5);

  return c.json({
    productsCount: actualProductsCount,
    productsRemaining,
    trialDaysRemaining,
    isTrialExpired,
    status: subscription.status || 'Prueba',
    membershipStatus,
    membershipExpiration: subscription.membership_expiration,
    isMembershipExpired,
    canGenerate,
    phoneNumber: subscription.phone_number,
    countryCode: subscription.country_code,
    isPremium: subscription.is_premium || false,
    storeName: subscription.store_name,
    carouselEnabled: subscription.carousel_enabled === 1,
  });
});

app.post("/increment-product-count", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET products_count = products_count + 1, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(user.id).run();

  return c.json({ success: true });
});

// Public endpoint to get user's contact info for their catalog page
app.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");

  const subscription = await c.env.DB.prepare(
    "SELECT phone_number, country_code, carousel_enabled, slogan, instagram_url, facebook_url, tiktok_url FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ 
      phone_number: null,
      country_code: null,
      carousel_enabled: false,
      slogan: null,
      instagram_url: null,
      facebook_url: null,
      tiktok_url: null,
    });
  }

  return c.json({
    phone_number: subscription.phone_number,
    country_code: subscription.country_code,
    carousel_enabled: subscription.carousel_enabled === 1,
    slogan: subscription.slogan || null,
    instagram_url: subscription.instagram_url || null,
    facebook_url: subscription.facebook_url || null,
    tiktok_url: subscription.tiktok_url || null,
  });
});

export default app;
