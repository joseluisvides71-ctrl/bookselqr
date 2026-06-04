import { Hono } from 'hono';
import { authMiddleware } from '@getmocha/users-service/backend';
import type { Env } from '@/shared/types';
import { uploadToCloudinary } from '../utils/cloudinary';

const router = new Hono<{ Bindings: Env }>();

// Get all products - PUBLIC ENDPOINT (no auth required)
// SECURITY: ALWAYS requires userId parameter to prevent data leakage
// SECURITY: Verifies user account exists before returning products
router.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    
    // CRITICAL SECURITY: Never return all products without filtering by user
    if (!userId) {
      return c.json({ error: 'userId parameter is required' }, 400);
    }
    
    // SECURITY VALIDATION: Verify the user account still exists in user_subscriptions
    const userExists = await c.env.DB.prepare(
      'SELECT user_id FROM user_subscriptions WHERE user_id = ?'
    ).bind(userId).first();

    if (!userExists) {
      console.log(`[SECURITY] Blocked catalog access - user deleted: ${userId}`);
      return c.json({ 
        error: 'Esta cuenta ya no existe o ha sido dada de baja',
        errorCode: 'ACCOUNT_DELETED',
        products: []
      }, 403);
    }
    
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM products WHERE user_id = ? ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order ASC, created_at DESC'
    ).bind(userId).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Error al obtener productos' }, 500);
  }
});

// Get products by store name - PUBLIC ENDPOINT
// SECURITY: This endpoint is public but ONLY returns products for the specified store
// SECURITY: Also verifies the user account still exists (not deleted by admin)
// VISIBILITY: Only returns products marked as visible (is_visible = 1)
router.get('/tienda/:storeName', async (c) => {
  try {
    const storeName = c.req.param('storeName');
    
    // SECURITY VALIDATION: Get user by store name and verify account exists
    const subscription = await c.env.DB.prepare(
      'SELECT user_id, store_name FROM user_subscriptions WHERE LOWER(REPLACE(store_name, " ", "-")) = ?'
    ).bind(storeName.toLowerCase()).first() as any;

    if (!subscription) {
      console.log(`[SECURITY] Store not found or user deleted: ${storeName}`);
      return c.json({ 
        error: 'Esta tienda ya no existe o ha sido dada de baja',
        errorCode: 'STORE_NOT_FOUND',
        storeName: null 
      }, 404);
    }

    // SECURITY: Verify the user_id in subscription still has an active account
    // If the user was deleted, their subscription record would be gone too
    // This double-check ensures data integrity
    
    // SECURITY & VISIBILITY: Get products ONLY for this specific user_id AND only visible products
    // STRICT FILTER: Only show products explicitly marked as visible (is_visible = 1)
    // ORDER: By sort_order ASC (nulls last), then by created_at DESC
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM products WHERE user_id = ? AND is_visible = 1 ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order ASC, created_at DESC'
    ).bind(subscription.user_id).all();

    console.log(`[CATALOG ACCESS] Store: ${subscription.store_name}, User: ${subscription.user_id}, Products: ${results.length}`);

    return c.json({ 
      products: results,
      storeName: subscription.store_name,
      userId: subscription.user_id
    });
  } catch (error) {
    console.error('Error fetching store products:', error);
    return c.json({ error: 'Error al obtener productos de la tienda' }, 500);
  }
});

// Create a new product
router.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      console.error('No user found in request context');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // SECURITY VALIDATION: Verify user still has active subscription
    const subscription = await c.env.DB.prepare(
      'SELECT user_id FROM user_subscriptions WHERE user_id = ?'
    ).bind(user.id).first();

    if (!subscription) {
      console.log(`[SECURITY] Blocked product creation - user deleted: ${user.id}`);
      return c.json({ 
        error: 'Esta cuenta ya no existe o ha sido dada de baja',
        errorCode: 'ACCOUNT_DELETED'
      }, 403);
    }

    let formData;
    try {
      formData = await c.req.formData();
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return c.json({ error: 'Error al procesar los datos del formulario' }, 400);
    }
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;
    const categoria = (formData.get('categoria') as string) || 'Otros';
    const offerType = (formData.get('offer_type') as string) || 'Producto';
    const brand = formData.get('brand') as string | null;
    const condition = (formData.get('condition') as string) || 'Nuevo';
    const productStateStr = formData.get('product_state') as string | null;
    const productState = productStateStr ? parseInt(productStateStr) : null;
    const offerPriceStr = formData.get('offer_price') as string | null;
    const offerPrice = offerPriceStr ? parseFloat(offerPriceStr) : null;
    const offerEndDate = formData.get('offer_end_date') as string | null;
    const isVisibleStr = formData.get('is_visible') as string | null;
    // Default to visible (true) if not provided, only hide if explicitly set to '0' or 'false'
    const isVisible = isVisibleStr === '0' || isVisibleStr === 'false' ? false : true;
    const ocultarPrecioStr = formData.get('ocultar_precio') as string | null;
    const ocultarPrecio = ocultarPrecioStr === '1' || ocultarPrecioStr === 'true' ? true : false;
    const image = formData.get('image') as File | null;
    const image2 = formData.get('image_2') as File | null;
    const image3 = formData.get('image_3') as File | null;

    if (!name || !price || !description) {
      return c.json({ error: 'Faltan datos requeridos' }, 400);
    }

    // SECURITY VALIDATION: Check if user has carousel enabled before allowing image_2/image_3
    const userSubscription = await c.env.DB.prepare(
      'SELECT carousel_enabled FROM user_subscriptions WHERE user_id = ?'
    ).bind(user.id).first() as any;

    const carouselEnabled = userSubscription?.carousel_enabled === 1;

    // Reject additional images if carousel not enabled
    if ((image2 || image3) && !carouselEnabled) {
      return c.json({ 
        error: 'El carrusel de 3 fotos no está habilitado en tu cuenta. Contacta al administrador.',
        errorCode: 'CAROUSEL_NOT_ENABLED'
      }, 403);
    }

    let imageUrl: string | null = null;
    let imageUrl2: string | null = null;
    let imageUrl3: string | null = null;

    // Upload primary image to Cloudinary if provided
    if (image && image.size > 0) {
      try {
        imageUrl = await uploadToCloudinary(image, c.env);
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        return c.json({ error: 'Error al subir la imagen a Cloudinary' }, 500);
      }
    }

    // Upload second image to Cloudinary if provided
    if (image2 && image2.size > 0) {
      try {
        imageUrl2 = await uploadToCloudinary(image2, c.env);
      } catch (uploadError) {
        console.error('Error uploading second image to Cloudinary:', uploadError);
      }
    }

    // Upload third image to Cloudinary if provided
    if (image3 && image3.size > 0) {
      try {
        imageUrl3 = await uploadToCloudinary(image3, c.env);
      } catch (uploadError) {
        console.error('Error uploading third image to Cloudinary:', uploadError);
      }
    }

    // Insert product into database
    let result;
    try {
      result = await c.env.DB.prepare(
        'INSERT INTO products (user_id, name, price, description, image_url, image_url_2, image_url_3, categoria, offer_type, brand, condition, product_state, offer_price, offer_end_date, is_visible, ocultar_precio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(user.id, name, price, description, imageUrl, imageUrl2, imageUrl3, categoria, offerType, brand, condition, productState, offerPrice, offerEndDate, isVisible ? 1 : 0, ocultarPrecio ? 1 : 0).run();
    } catch (dbError) {
      console.error('Error inserting product into database:', dbError);
      return c.json({ error: 'Error al guardar el producto en la base de datos' }, 500);
    }

    // Update products count in user_subscriptions
    try {
      await c.env.DB.prepare(
        'UPDATE user_subscriptions SET products_count = products_count + 1, updated_at = datetime("now") WHERE user_id = ?'
      ).bind(user.id).run();
    } catch (countError) {
      console.error('Error updating products count:', countError);
      // Don't fail the request if count update fails
    }

    const newProduct = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return c.json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ error: 'Error al crear producto' }, 500);
  }
});

// Update a product
router.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // SECURITY VALIDATION: Verify user still has active subscription
    const subscription = await c.env.DB.prepare(
      'SELECT user_id FROM user_subscriptions WHERE user_id = ?'
    ).bind(user.id).first();

    if (!subscription) {
      console.log(`[SECURITY] Blocked product update - user deleted: ${user.id}`);
      return c.json({ 
        error: 'Esta cuenta ya no existe o ha sido dada de baja',
        errorCode: 'ACCOUNT_DELETED'
      }, 403);
    }

    const productId = c.req.param('id');
    
    // Check if product exists and belongs to user
    const existingProduct = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ? AND user_id = ?'
    ).bind(productId, user.id).first() as any;

    if (!existingProduct) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    const formData = await c.req.formData();
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;
    const categoria = (formData.get('categoria') as string) || 'Otros';
    const offerType = (formData.get('offer_type') as string) || 'Producto';
    const brand = formData.get('brand') as string | null;
    const condition = (formData.get('condition') as string) || 'Nuevo';
    const productStateStr = formData.get('product_state') as string | null;
    const productState = productStateStr ? parseInt(productStateStr) : null;
    const offerPriceStr = formData.get('offer_price') as string | null;
    const offerPrice = offerPriceStr && offerPriceStr !== '' ? parseFloat(offerPriceStr) : null;
    const offerEndDate = formData.get('offer_end_date') as string | null;
    const offerEndDateValue = offerEndDate && offerEndDate !== '' ? offerEndDate : null;
    const isVisibleStr = formData.get('is_visible') as string | null;
    // Default to visible (true) if not provided, only hide if explicitly set to '0' or 'false'
    const isVisible = isVisibleStr === '0' || isVisibleStr === 'false' ? false : true;
    const ocultarPrecioStr = formData.get('ocultar_precio') as string | null;
    const ocultarPrecio = ocultarPrecioStr === '1' || ocultarPrecioStr === 'true' ? true : false;
    const sortOrderStr = formData.get('sort_order') as string | null;
    const sortOrder = sortOrderStr ? parseInt(sortOrderStr) : null;
    const image = formData.get('image') as File | null;
    const image2 = formData.get('image_2') as File | null;
    const image3 = formData.get('image_3') as File | null;
    const deleteImage = formData.get('deleteImage') === 'true';
    const deleteImage2 = formData.get('deleteImage2') === 'true';
    const deleteImage3 = formData.get('deleteImage3') === 'true';

    if (!name || !price || !description) {
      return c.json({ error: 'Faltan datos requeridos' }, 400);
    }

    // SECURITY VALIDATION: Check if user has carousel enabled before allowing image_2/image_3
    const userSubscription = await c.env.DB.prepare(
      'SELECT carousel_enabled FROM user_subscriptions WHERE user_id = ?'
    ).bind(user.id).first() as any;

    const carouselEnabled = userSubscription?.carousel_enabled === 1;

    // Reject additional images if carousel not enabled
    if ((image2 || image3) && !carouselEnabled) {
      return c.json({ 
        error: 'El carrusel de 3 fotos no está habilitado en tu cuenta. Contacta al administrador.',
        errorCode: 'CAROUSEL_NOT_ENABLED'
      }, 403);
    }

    let imageUrl = existingProduct.image_url;
    let imageUrl2 = existingProduct.image_url_2;
    let imageUrl3 = existingProduct.image_url_3;

    // Handle primary image deletion
    if (deleteImage) {
      imageUrl = null;
    }

    // Handle new primary image upload to Cloudinary
    if (image && image.size > 0) {
      try {
        imageUrl = await uploadToCloudinary(image, c.env);
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        return c.json({ error: 'Error al subir la imagen a Cloudinary' }, 500);
      }
    }

    // Handle second image deletion
    if (deleteImage2) {
      imageUrl2 = null;
    }

    // Handle new second image upload to Cloudinary
    if (image2 && image2.size > 0) {
      try {
        imageUrl2 = await uploadToCloudinary(image2, c.env);
      } catch (uploadError) {
        console.error('Error uploading second image to Cloudinary:', uploadError);
      }
    }

    // Handle third image deletion
    if (deleteImage3) {
      imageUrl3 = null;
    }

    // Handle new third image upload to Cloudinary
    if (image3 && image3.size > 0) {
      try {
        imageUrl3 = await uploadToCloudinary(image3, c.env);
      } catch (uploadError) {
        console.error('Error uploading third image to Cloudinary:', uploadError);
      }
    }

    // Update product in database
    await c.env.DB.prepare(
      'UPDATE products SET name = ?, price = ?, description = ?, image_url = ?, image_url_2 = ?, image_url_3 = ?, categoria = ?, offer_type = ?, brand = ?, condition = ?, product_state = ?, offer_price = ?, offer_end_date = ?, is_visible = ?, ocultar_precio = ?, sort_order = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(name, price, description, imageUrl, imageUrl2, imageUrl3, categoria, offerType, brand, condition, productState, offerPrice, offerEndDateValue, isVisible ? 1 : 0, ocultarPrecio ? 1 : 0, sortOrder, productId).run();

    const updatedProduct = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(productId).first();

    return c.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Error al actualizar producto' }, 500);
  }
});

// Delete a product
router.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // SECURITY VALIDATION: Verify user still has active subscription
    const subscription = await c.env.DB.prepare(
      'SELECT user_id FROM user_subscriptions WHERE user_id = ?'
    ).bind(user.id).first();

    if (!subscription) {
      console.log(`[SECURITY] Blocked product deletion - user deleted: ${user.id}`);
      return c.json({ 
        error: 'Esta cuenta ya no existe o ha sido dada de baja',
        errorCode: 'ACCOUNT_DELETED'
      }, 403);
    }

    const productId = c.req.param('id');
    
    // Get product to check ownership and get image URL
    const product = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ? AND user_id = ?'
    ).bind(productId, user.id).first() as any;

    if (!product) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    // Delete images from R2 if they exist (for backward compatibility with old products)
    // New products use Cloudinary URLs which don't need deletion
    if (product.image_url && product.image_url.startsWith('/api/products/images/')) {
      const imageKey = product.image_url.replace('/api/products/images/', '');
      try {
        await c.env.R2_BUCKET.delete(imageKey);
      } catch (e) {
        console.error('Error deleting R2 image:', e);
      }
    }

    if (product.image_url_2 && product.image_url_2.startsWith('/api/products/images/')) {
      const imageKey = product.image_url_2.replace('/api/products/images/', '');
      try {
        await c.env.R2_BUCKET.delete(imageKey);
      } catch (e) {
        console.error('Error deleting R2 image 2:', e);
      }
    }

    if (product.image_url_3 && product.image_url_3.startsWith('/api/products/images/')) {
      const imageKey = product.image_url_3.replace('/api/products/images/', '');
      try {
        await c.env.R2_BUCKET.delete(imageKey);
      } catch (e) {
        console.error('Error deleting R2 image 3:', e);
      }
    }

    // Delete product from database
    await c.env.DB.prepare(
      'DELETE FROM products WHERE id = ?'
    ).bind(productId).run();

    // Decrement products count in user_subscriptions
    await c.env.DB.prepare(
      'UPDATE user_subscriptions SET products_count = GREATEST(0, products_count - 1), updated_at = datetime("now") WHERE user_id = ?'
    ).bind(user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Error al eliminar producto' }, 500);
  }
});

// Serve images from R2 - PUBLIC ENDPOINT
router.get('/images/*', async (c) => {
  try {
    const key = c.req.path.replace('/api/products/images/', '');
    const object = await c.env.R2_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return c.body(object.body, { headers });
  } catch (error) {
    console.error('Error serving image:', error);
    return c.json({ error: 'Error al cargar imagen' }, 500);
  }
});

// Like a product - PUBLIC ENDPOINT (no auth required)
router.post('/:id/like', async (c) => {
  try {
    const productId = c.req.param('id');
    
    // Increment likes_count
    const result = await c.env.DB.prepare(
      'UPDATE products SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(productId).run();

    if (!result.success) {
      return c.json({ error: 'Error al dar like' }, 500);
    }

    // Get updated likes count
    const product = await c.env.DB.prepare(
      'SELECT likes_count FROM products WHERE id = ?'
    ).bind(productId).first() as any;

    return c.json({ likes_count: product?.likes_count || 0 });
  } catch (error) {
    console.error('Error liking product:', error);
    return c.json({ error: 'Error al dar like' }, 500);
  }
});

export default router;
