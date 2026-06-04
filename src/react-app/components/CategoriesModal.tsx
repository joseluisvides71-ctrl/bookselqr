import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear categoría');
      }

      await fetchCategories();
      setNewCategoryName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('¿Estás seguro? Los productos con esta categoría se cambiarán a "Sin Categoría"')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar categoría');
      }

      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Mis Categorías</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAddCategory} className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nueva Categoría
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Pupusas, Bebidas, Calzado..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar
              </button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </form>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Categorías Creadas ({categories.length})
            </h3>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tienes categorías personalizadas aún</p>
                <p className="text-sm mt-1">Crea tu primera categoría arriba</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-medium text-slate-900">{category.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
