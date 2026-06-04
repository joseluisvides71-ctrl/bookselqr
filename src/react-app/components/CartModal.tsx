import { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, MessageCircle, User, MapPin } from 'lucide-react';
import { useCart } from '../hooks/useCart';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerPhone: string;
  ownerCountryCode: string;
  storeName: string;
}

export function CartModal({ isOpen, onClose, ownerPhone, ownerCountryCode }: CartModalProps) {
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  if (!isOpen) return null;

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) {
      alert('Por favor, ingresa tu nombre');
      return;
    }

    // Build structured message following UTF-8 format with proper spacing
    let message = `🛒 NUEVO PEDIDO DESDE TU CATÁLOGO\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `👤 Cliente: ${customerName.trim()}\n\n`;
    
    if (deliveryAddress.trim()) {
      message += `📍 Entrega: ${deliveryAddress.trim()}\n\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📦 Productos:\n\n`;

    items.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      message += `${index + 1}. ${item.name}\n`;
      message += `   Cantidad: ${item.quantity} x $${item.price.toFixed(2)}\n`;
      message += `   Subtotal: $${subtotal.toFixed(2)}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 TOTAL A PAGAR: $${totalPrice.toFixed(2)}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `✅ Por favor, confirma la recepción de este pedido.`;

    // Clean phone numbers
    const cleanPhone = ownerPhone.replace(/\D/g, '');
    const cleanCountry = ownerCountryCode.replace(/\D/g, '');
    const whatsappNumber = `${cleanCountry}${cleanPhone}`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Clear cart and form after sending
    clearCart();
    setCustomerName('');
    setDeliveryAddress('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Tu Carrito</h2>
              <p className="text-green-100 text-sm">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                        {item.name}
                      </h3>
                      <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                        ${item.price.toFixed(2)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white rounded transition-colors"
                          >
                            <Minus className="w-4 h-4 text-slate-600" />
                          </button>
                          <span className="w-8 text-center font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white rounded transition-colors"
                          >
                            <Plus className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Subtotal</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Tu carrito está vacío</p>
              <p className="text-sm text-slate-400">Agrega productos para comenzar tu pedido</p>
            </div>
          )}
        </div>

        {/* Footer with Customer Info, Total and Checkout */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl flex-shrink-0 space-y-4">
            {/* Customer Name Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Tu Nombre *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {/* Delivery Address Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Dirección de Entrega (Opcional)
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Calle Principal #123, Col. Centro"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-lg font-semibold text-slate-700">Total:</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleWhatsAppCheckout}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6" fill="currentColor" />
              <span>Confirmar Pedido por WhatsApp</span>
            </button>

            <p className="text-xs text-slate-500 text-center">
              Se abrirá WhatsApp con tu pedido listo para enviar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
