import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get branding settings for authenticated user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const subscription = await c.env.DB.prepare(
    "SELECT logo_url, primary_color, has_branding_unlocked FROM user_subscriptions WHERE user_id = ?"
  ).bind(user.id).first() as any;

  if (!subscription) {
    return c.json({ error: "Subscription not found" }, 404);
  }

  return c.json({
    logoUrl: subscription.logo_url,
    primaryColor: subscription.primary_color || '#6366f1',
    hasBrandingUnlocked: subscription.has_branding_unlocked === 1,
  });
});

// Upload logo image
app.post("/upload-logo", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check if user has branding unlocked
  const subscription = await c.env.DB.prepare(
    "SELECT has_branding_unlocked FROM user_subscriptions WHERE user_id = ?"
  ).bind(user.id).first() as any;

  if (!subscription || subscription.has_branding_unlocked !== 1) {
    return c.json({ error: "Marca Pro no activada" }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get("logo") as File;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "File too large. Maximum size is 5MB." }, 400);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const key = `logos/${user.id}/${timestamp}.${extension}`;

  // Upload to R2
  await c.env.R2_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Generate URL
  const logoUrl = `/api/branding/logo/${user.id}/${timestamp}.${extension}`;

  // Update database
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET logo_url = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(logoUrl, user.id).run();

  return c.json({ logoUrl });
});

// Serve logo image
app.get("/logo/:userId/:filename", async (c) => {
  const userId = c.req.param("userId");
  const filename = c.req.param("filename");
  const key = `logos/${userId}/${filename}`;

  const object = await c.env.R2_BUCKET.get(key);

  if (!object) {
    return c.json({ error: "Logo not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");

  return c.body(object.body, { headers });
});

// Update branding settings for authenticated user
app.post("/update", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check if user has branding unlocked
  const subscription = await c.env.DB.prepare(
    "SELECT has_branding_unlocked FROM user_subscriptions WHERE user_id = ?"
  ).bind(user.id).first() as any;

  if (!subscription || subscription.has_branding_unlocked !== 1) {
    return c.json({ error: "Marca Pro no activada" }, 403);
  }

  const body = await c.req.json();
  const { primaryColor } = body;

  // Update branding settings
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET primary_color = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(primaryColor || '#6366f1', user.id).run();

  return c.json({ success: true });
});

// Get branding settings for a store (public endpoint)
app.get("/store/:userId", async (c) => {
  const userId = c.req.param("userId");

  const subscription = await c.env.DB.prepare(
    "SELECT logo_url, primary_color, has_branding_unlocked FROM user_subscriptions WHERE user_id = ?"
  ).bind(userId).first() as any;

  if (!subscription) {
    return c.json({ 
      hasBranding: false,
      logoUrl: null,
      primaryColor: '#6366f1',
    });
  }

  // Only return branding if unlocked
  if (subscription.has_branding_unlocked !== 1) {
    return c.json({ 
      hasBranding: false,
      logoUrl: null,
      primaryColor: '#6366f1',
    });
  }

  return c.json({
    hasBranding: true,
    logoUrl: subscription.logo_url,
    primaryColor: subscription.primary_color || '#6366f1',
  });
});

export default app;
