import { Hono } from "hono";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";

const app = new Hono<{ Bindings: Env }>();

app.get("/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const ADMIN_EMAIL = "joseluis.vides@gmail.com";
  
  try {
    // Check if user subscription exists in database
    const subscription = await c.env.DB.prepare(
      "SELECT * FROM user_subscriptions WHERE user_id = ?"
    ).bind(user.id).first();

    if (!subscription) {
      // ADMIN EXCEPTION: Never block the admin user
      if (user.email === ADMIN_EMAIL) {
        console.log(`[AUTH] Admin user ${user.email} - creating subscription if missing`);
        const referralCode = user.id.substring(0, 8).toUpperCase();
        
        await c.env.DB.prepare(
          "INSERT INTO user_subscriptions (user_id, email, trial_started_at, referral_code) VALUES (?, ?, datetime('now'), ?)"
        ).bind(user.id, user.email, referralCode).run();
        
        return c.json(user);
      }
      
      // Check if this is a deleted user (has orphaned data) or a new user
      const hasOrphanedData = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM products WHERE user_id = ?"
      ).bind(user.id).first() as any;
      
      if (hasOrphanedData && hasOrphanedData.count > 0) {
        // User was deleted by admin - log it but DO NOT block them
        // Just log the attempt for security monitoring
        console.log(`[AUTH WARNING] User ${user.id} (${user.email}) has orphaned data - was likely deleted`);
        
        // For now, recreate their subscription so they can access
        // The admin can delete them again if needed
        const referralCode = user.id.substring(0, 8).toUpperCase();
        
        await c.env.DB.prepare(
          "INSERT INTO user_subscriptions (user_id, email, trial_started_at, referral_code) VALUES (?, ?, datetime('now'), ?)"
        ).bind(user.id, user.email, referralCode).run();
        
        console.log(`[AUTH] Recreated subscription for user ${user.id}`);
      } else {
        // New user - create subscription
        console.log(`[AUTH] Creating new subscription for user ${user.id}`);
        const referralCode = user.id.substring(0, 8).toUpperCase();
        
        await c.env.DB.prepare(
          "INSERT INTO user_subscriptions (user_id, email, trial_started_at, referral_code) VALUES (?, ?, datetime('now'), ?)"
        ).bind(user.id, user.email, referralCode).run();
      }
    } else if (!subscription.email && user.email) {
      // Existing user without email - update retroactively
      console.log(`[AUTH] Updating email for existing user ${user.id}`);
      await c.env.DB.prepare(
        "UPDATE user_subscriptions SET email = ? WHERE user_id = ?"
      ).bind(user.email, user.id).run();
    }

    return c.json(user);
  } catch (error) {
    // If there's ANY error, still return the user object
    // Don't block access due to database errors
    console.error('[AUTH ERROR] Error checking user subscription:', error);
    return c.json(user);
  }
});

app.get("/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

export default app;
