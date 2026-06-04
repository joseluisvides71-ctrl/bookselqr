import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

const ADMIN_EMAIL = "joseluis.vides@gmail.com";

// Upload QR code image (admin only)
app.post("/upload-qr", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: "File must be an image" }, 400);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 10MB" }, 400);
    }

    // Generate unique key for the file
    const fileExtension = file.name.split('.').pop() || 'png';
    const key = `payment-qr/usdt-qr.${fileExtension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Update database with the R2 key
    await c.env.DB.prepare(
      "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_usdt_qr_url'"
    ).bind(key).run();

    return c.json({ 
      success: true,
      key: key,
      url: `/api/payment-files/qr/${key}`
    });
  } catch (error) {
    console.error('Error uploading QR image:', error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// Get QR code image (public access)
app.get("/qr/*", async (c) => {
  try {
    // Get the key from the path (everything after /qr/)
    const path = c.req.path;
    const key = path.replace('/api/payment-files/qr/', '');
    
    if (!key) {
      return c.json({ error: "No file specified" }, 400);
    }

    // Get file from R2
    const object = await c.env.R2_BUCKET.get(key);
    
    if (!object) {
      return c.notFound();
    }

    // Set appropriate headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');

    return c.body(object.body, { headers });
  } catch (error) {
    console.error('Error fetching QR image:', error);
    return c.json({ error: "Failed to fetch image" }, 500);
  }
});

// Delete QR code image (admin only)
app.delete("/delete-qr", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    // Get current QR key from database
    const config = await c.env.DB.prepare(
      "SELECT config_value FROM admin_config WHERE config_key = 'payment_usdt_qr_url'"
    ).first() as any;

    if (config && config.config_value) {
      // Delete from R2
      await c.env.R2_BUCKET.delete(config.config_value);
    }

    // Clear database value
    await c.env.DB.prepare(
      "UPDATE admin_config SET config_value = '', updated_at = datetime('now') WHERE config_key = 'payment_usdt_qr_url'"
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting QR image:', error);
    return c.json({ error: "Failed to delete image" }, 500);
  }
});

// Upload Wompi QR code image (admin only)
app.post("/upload-wompi-qr", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (!file.type.startsWith('image/')) {
      return c.json({ error: "File must be an image" }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 10MB" }, 400);
    }

    const fileExtension = file.name.split('.').pop() || 'png';
    const key = `payment-qr/wompi-qr.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    await c.env.DB.prepare(
      "UPDATE admin_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'payment_wompi_qr_url'"
    ).bind(key).run();

    return c.json({ 
      success: true,
      key: key,
      url: `/api/payment-files/qr/${key}`
    });
  } catch (error) {
    console.error('Error uploading Wompi QR:', error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

export default app;
