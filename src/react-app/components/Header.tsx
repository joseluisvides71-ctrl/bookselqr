import { User, Plus, PackageOpen, ShoppingCart } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';

interface HeaderProps {
  onGenerateClick: () => void;
  canGenerate: boolean;
  isOwner?: boolean;
  onInventoryClick?: () => void;
  onCartClick?: () => void;
  cartItemCount?: number;
  inventoryCount?: number;
}

export function Header({ 
  onGenerateClick, 
  canGenerate, 
  isOwner, 
  onInventoryClick,
  onCartClick,
  cartItemCount = 0,
  inventoryCount = 0
}: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Title - Left side */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">BookselQR</h1>
          </div>
          
          {/* Icon Navigation - Center with space-around, Profile has 25px right margin */}
          <div className="flex items-center justify-around flex-1 max-w-md mx-auto">
            {/* Shopping Cart Icon - Green - visible to everyone */}
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="p-2 hover:bg-green-50 rounded-lg transition-all duration-200 group flex items-center justify-center relative"
                title="Carrito de Compras"
              >
                <ShoppingCart className="w-6 h-6 text-green-600" strokeWidth={2} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Catalog/Inventory Icon - Red with counter - only visible for owners */}
            {user && isOwner && onInventoryClick && (
              <button
                onClick={onInventoryClick}
                className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group flex items-center justify-center relative"
                title="Gestión de Inventario"
              >
                <PackageOpen className="w-6 h-6 text-red-600" strokeWidth={2} />
                {inventoryCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {inventoryCount > 99 ? '99+' : inventoryCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Add Product Icon - Black/Dark - only for owners */}
            {isOwner && (
              <button
                onClick={onGenerateClick}
                disabled={!canGenerate}
                className={`p-2 rounded-lg transition-all duration-200 group flex items-center justify-center ${
                  canGenerate
                    ? 'hover:bg-slate-100'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={!canGenerate ? 'Activa tu plan para continuar' : 'Agregar Producto'}
              >
                <Plus className="w-6 h-6 text-slate-900" strokeWidth={2} />
              </button>
            )}

            {/* Profile Icon - Indigo/Brand Color with 30px right padding */}
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-all duration-200 group flex items-center justify-center pr-[30px]"
                title="Mi Perfil"
              >
                <User className="w-6 h-6 text-indigo-600" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
