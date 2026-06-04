import { useEffect, useState } from 'react';
import { X, CreditCard, MessageCircle, Loader2, Copy, Check } from 'lucide-react';

interface ActivatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  userEmail: string;
}

interface PaymentConfig {
  payment_whatsapp_support: string;
  payment_usdt_address: string;
  payment_subscription_price: string;
  payment_monthly_maintenance: string;
  payment_wompi_qr_url: string;
  payment_wompi_link: string;
}

export function ActivatePlanModal({ isOpen, onClose, storeName, userEmail }: ActivatePlanModalProps) {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPaymentConfig();
    }
  }, [isOpen]);

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch('/api/admin/public/payment-config');
      if (response.ok) {
        const data = await response.json();
        setPaymentConfig(data);
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePaymentConfirmation = () => {
    if (!paymentConfig?.payment_whatsapp_support) {
      alert('Número de WhatsApp de soporte no configurado');
      return;
    }
    
    const subscriptionPrice = paymentConfig.payment_subscription_price || '15';
    const storeInfo = storeName ? ` (Tienda: ${storeName})` : '';
    const message = `Hola, realicé mi pago de $${subscriptionPrice} (Plan 3 meses) para el correo: ${userEmail}${storeInfo}. Adjunto comprobante.`;
    
    const whatsappUrl = `https://wa.me/${paymentConfig.payment_whatsapp_support.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyAddress = async () => {
    if (!paymentConfig?.payment_usdt_address) return;
    
    try {
      await navigator.clipboard.writeText(paymentConfig.payment_usdt_address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error('Error copying address:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">🚀 Activar Plan Ilimitado</h2>
                <p className="text-indigo-100 text-sm">3 meses por solo ${paymentConfig?.payment_subscription_price || '15'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plan Benefits */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">✨ Beneficios del Plan Ilimitado</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-slate-700">Productos ilimitados en tu catálogo</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-slate-700">Generación automática con IA sin restricciones</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-slate-700">Integración completa con WhatsApp</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-slate-700">Soporte prioritario</span>
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="bg-white border-2 border-indigo-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <p className="text-slate-600 text-sm mb-2">Precio especial de lanzamiento</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ${paymentConfig?.payment_subscription_price || '15'}
                </span>
                <div className="text-left">
                  <p className="text-sm text-slate-600">por</p>
                  <p className="text-lg font-bold text-slate-900">3 meses</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Después solo ${paymentConfig?.payment_monthly_maintenance || '2'}/mes de mantenimiento
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">💳 Métodos de Pago Disponibles</h3>
            <div className="space-y-3">
              {/* Wompi Payment */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">Pago con Tarjeta (Wompi)</h4>
                    <p className="text-sm text-slate-600 mb-2">Paga con tarjeta de crédito o débito</p>
                    {loading ? (
                      <div className="bg-white rounded-lg p-6 border border-slate-200 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-3">
                        {paymentConfig?.payment_wompi_qr_url && (
                          <div className="flex justify-center">
                            <img 
                              src={paymentConfig.payment_wompi_qr_url.startsWith('http') 
                                ? paymentConfig.payment_wompi_qr_url 
                                : `/api/payment-files/qr/${paymentConfig.payment_wompi_qr_url}`}
                              alt="QR Wompi"
                              className="w-40 h-40 rounded-lg border-2 border-purple-200 shadow-md"
                            />
                          </div>
                        )}
                        {paymentConfig?.payment_wompi_link ? (
                          <a
                            href={paymentConfig.payment_wompi_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pagar con Wompi
                          </a>
                        ) : (
                          <p className="text-center text-sm text-slate-500">Link de pago no configurado</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* USDT Crypto */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">Criptomoneda USDT</h4>
                    <p className="text-sm text-slate-600 mb-2">Red TRC-20 (Tron)</p>
                    {loading ? (
                      <div className="bg-white rounded-lg p-6 border border-slate-200 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : paymentConfig?.payment_usdt_address ? (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Dirección:</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs text-slate-900 break-all flex-1">
                            {paymentConfig.payment_usdt_address}
                          </p>
                          <button
                            onClick={handleCopyAddress}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold flex-shrink-0"
                          >
                            {copiedAddress ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-sm text-slate-500">No configurado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Button */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <h3 className="font-bold text-slate-900 mb-2">¿Ya realizaste tu pago?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Envíanos tu comprobante por WhatsApp y activaremos tu plan inmediatamente
            </p>
            <button
              onClick={handlePaymentConfirmation}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-6 h-6" />
              Ya realicé mi pago
            </button>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Se abrirá WhatsApp con un mensaje pre-escrito. Solo adjunta tu comprobante.
            </p>
          </div>

          {/* Support */}
          <div className="text-center text-sm text-slate-500">
            <p>¿Necesitas ayuda? Contáctanos al {paymentConfig?.payment_whatsapp_support || 'WhatsApp'}</p>
            <p className="mt-1">Activación inmediata al confirmar pago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
