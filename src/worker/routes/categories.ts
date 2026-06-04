import { Hono } from 'hono';
import { authMiddleware } from '@getmocha/users-service/backend';
import type { Env } from '@/shared/types';

const router = new Hono<{ Bindings: Env }>();

// Get all categories for authenticated user
router.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM user_categories WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Error al obtener categorías' }, 500);
  }
});

// Create a new category
router.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name } = await c.req.json();

    if (!name || !name.trim()) {
      return c.json({ error: 'El nombre es requerido' }, 400);
    }

    // Check if category already exists for this user
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_categories WHERE user_id = ? AND name = ?'
    ).bind(user.id, name.trim()).first();

    if (existing) {
      return c.json({ error: 'Ya existe una categoría con ese nombre' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO user_categories (user_id, name) VALUES (?, ?)'
    ).bind(user.id, name.trim()).run();

    const newCategory = await c.env.DB.prepare(
      'SELECT * FROM user_categories WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return c.json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json({ error: 'Error al crear categoría' }, 500);
  }
});

// Delete a category
router.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const categoryId = c.req.param('id');
    
    // Get category to verify ownership
    const category = await c.env.DB.prepare(
      'SELECT * FROM user_categories WHERE id = ? AND user_id = ?'
    ).bind(categoryId, user.id).first() as any;

    if (!category) {
      return c.json({ error: 'Categoría no encontrada' }, 404);
    }

    // Update products with this category to "Sin Categoría"
    await c.env.DB.prepare(
      'UPDATE products SET categoria = ? WHERE user_id = ? AND categoria = ?'
    ).bind('Sin Categoría', user.id, category.name).run();

    // Delete category
    await c.env.DB.prepare(
      'DELETE FROM user_categories WHERE id = ?'
    ).bind(categoryId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ error: 'Error al eliminar categoría' }, 500);
  }
});

export default router;
