import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Process referral when user completes profile
app.post("/process", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const { referralCode } = body;

  if (!referralCode) {
    return c.json({ success: true, message: "No referral code provided" });
  }

  try {
    // Find the referrer by their referral code
    const referrer = await c.env.DB.prepare(
      "SELECT user_id, referral_code FROM user_subscriptions WHERE referral_code = ?"
    ).bind(referralCode).first() as any;

    if (!referrer) {
      console.log('Referral code not found:', referralCode);
      return c.json({ success: true, message: "Invalid referral code" });
    }

    // Check if this user was already referred (prevent double-counting)
    const currentUser = await c.env.DB.prepare(
      "SELECT referred_by FROM user_subscriptions WHERE user_id = ?"
    ).bind(user.id).first() as any;

    if (currentUser?.referred_by) {
      console.log('User already has a referrer');
      return c.json({ success: true, message: "User already referred" });
    }

    // Update the new user's referred_by field
    await c.env.DB.prepare(
      "UPDATE user_subscriptions SET referred_by = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).bind(referralCode, user.id).run();

    // Increment the referrer's successful_referrals_count
    await c.env.DB.prepare(
      "UPDATE user_subscriptions SET successful_referrals_count = successful_referrals_count + 1, updated_at = datetime('now') WHERE user_id = ?"
    ).bind(referrer.user_id).run();

    // Create a log entry in referrals_log table
    await c.env.DB.prepare(
      "INSERT INTO referrals_log (referrer_id, referred_user_id, referral_code) VALUES (?, ?, ?)"
    ).bind(referrer.user_id, user.id, referralCode).run();

    console.log(`Referral processed: ${referrer.user_id} referred ${user.id}`);

    return c.json({ 
      success: true, 
      wasReferred: true,
      referrerCode: referralCode
    });
  } catch (error) {
    console.error('Error processing referral:', error);
    return c.json({ error: "Error processing referral" }, 500);
  }
});

// Get referral history for a user (admin or own history)
app.get("/history", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const referrals = await c.env.DB.prepare(`
    SELECT 
      rl.id,
      rl.referrer_id,
      rl.referred_user_id,
      rl.referral_code,
      rl.created_at,
      us.store_name as referred_store_name
    FROM referrals_log rl
    LEFT JOIN user_subscriptions us ON rl.referred_user_id = us.user_id
    WHERE rl.referrer_id = ?
    ORDER BY rl.created_at DESC
  `).bind(user.id).all();

  return c.json({ referrals: referrals.results || [] });
});

// Admin endpoint to get all referrals
app.get("/admin/all", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Only allow admin
  if (user.email !== 'joseluis.vides@gmail.com') {
    return c.json({ error: "Forbidden" }, 403);
  }

  const referrals = await c.env.DB.prepare(`
    SELECT 
      rl.id,
      rl.referrer_id,
      rl.referred_user_id,
      rl.referral_code,
      rl.created_at,
      referrer.store_name as referrer_store_name,
      referred.store_name as referred_store_name
    FROM referrals_log rl
    LEFT JOIN user_subscriptions referrer ON rl.referrer_id = referrer.user_id
    LEFT JOIN user_subscriptions referred ON rl.referred_user_id = referred.user_id
    ORDER BY rl.created_at DESC
  `).all();

  // Get total count
  const totalCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM referrals_log"
  ).first() as any;

  return c.json({ 
    referrals: referrals.results || [],
    totalCount: totalCount?.count || 0
  });
});

export default app;
