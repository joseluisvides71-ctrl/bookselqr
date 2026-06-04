import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Upload, MessageCircle, QrCode, Lock, CreditCard } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface PaymentCenterProps {
  onClose: () => void;
  defaultMembership?: boolean;
}

interface PaymentConfig {
  payment_usdt_address: string;
  payment_binance_id: string;
  payment_usdt_qr_url: string;
  payment_whatsapp_support: string;
  payment_subscription_price: string;
  payment_branding_price: string;
  payment_extra_offers: string;
  payment_wompi_qr_url: string;
  payment_wompi_link: string;
}

interface UserSubscription {
  membership_expiration: string | null;
  status: string;
}

export function PaymentCenter({ onClose, defaultMembership = false }: PaymentCenterProps) {
  const { user } = useAuth();
  const [membresia, setMembresia] = useState(defaultMembership);
  const [marcaPro, setMarcaPro] = useState(false);
  const [ofertas, setOfertas] = useState(false);
  const [copiedUSDT, setCopiedUSDT] = useState(false);
  const [copiedBinance, setCopiedBinance] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    fetchPaymentConfig();
    fetchUserSubscription();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch('/api/payments/config');
      if (response.ok) {
        const data = await response.json();
        setPaymentConfig(data);
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  if (!paymentConfig || !userSubscription) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Verificar si el usuario tiene membresía vigente
  const hasActiveMembership = () => {
    if (!userSubscription.membership_expiration) return false;
    const expirationDate = new Date(userSubscription.membership_expiration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expirationDate >= today;
  };

  const membershipActive = hasActiveMembership();
  const canSelectExtras = membresia || membershipActive;

  // Precios dinámicos desde la base de datos
  const precioMembresia = parseFloat(paymentConfig.payment_subscription_price || '15');
  const precioBranding = parseFloat(paymentConfig.payment_branding_price || '5');
  const precioExtraProductos = parseFloat(paymentConfig.payment_extra_offers || '5');

  // Calcular total
  const calcularTotal = () => {
    let total = 0;
    if (membresia) total += precioMembresia;
    if (marcaPro && canSelectExtras) total += precioBranding;
    if (ofertas && canSelectExtras) total += precioExtraProductos;
    return total;
  };

  const total = calcularTotal();

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
        return;
      }

      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleExtra = (setter: (val: boolean) => void, currentValue: boolean) => {
    if (!canSelectExtras) {
      return;
    }
    setter(!currentValue);
  };

  const handleNotificarPago = () => {
    const servicios = [];
    if (membresia) servicios.push(`Membresía Básica (3 meses) - $${precioMembresia}`);
    if (marcaPro && canSelectExtras) servicios.push(`Marca Pro (Quitar Logo Mocha) - $${precioBranding}`);
    if (ofertas && canSelectExtras) servicios.push(`Ofertas Premium - $${precioExtraProductos}`);

    if (servicios.length === 0) {
      alert('Por favor selecciona al menos un servicio');
      return;
    }

    if (!receiptFile) {
      alert('Por favor sube el comprobante de pago');
      return;
    }

    const mensaje = `🚀 *NUEVA SOLICITUD DE PAGO - BookselQR*

👤 *Usuario:* ${user?.email}

📋 *Servicios Solicitados:*
${servicios.map((s, i) => `${i + 1}. ${s}`).join('\n')}

💰 *Total: $${total} USD*

✅ *Comprobante adjunto*

Por favor procesar este pago y activar los servicios solicitados.`;

    const whatsappRaw = paymentConfig.payment_whatsapp_support || '+50370000000';
    const whatsappNumber = whatsappRaw.replace(/[\s\-+]/g, '');
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const usdtAddress = paymentConfig.payment_usdt_address || 'TXyZ1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o';
  const binanceId = paymentConfig.payment_binance_id || '123456789';
  const qrImageUrl = paymentConfig.payment_usdt_qr_url ? `/api/payment-files/qr/${paymentConfig.payment_usdt_qr_url}` : '';
  // Wompi configuration - handle both R2 keys and full URLs
  const wompiQrUrl = paymentConfig.payment_wompi_qr_url 
    ? (paymentConfig.payment_wompi_qr_url.startsWith('http') 
        ? paymentConfig.payment_wompi_qr_url 
        : `/api/payment-files/qr/${paymentConfig.payment_wompi_qr_url}`)
    : '';
  const wompiLink = paymentConfig.payment_wompi_link || '';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Centro de Pagos</h2>
              <p className="text-purple-100 text-xs sm:text-sm mt-1">Activa tu membresía y extras premium</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 1. Selección de Servicios */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Selecciona tus Servicios</h3>
            
            <div className="space-y-3">
              {/* Membresía Básica */}
              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3 border-2 border-indigo-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      Membresía Básica (3 Meses)
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Recomendado</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 mt-0.5">Catálogo activo por 3 meses sin restricciones</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-lg sm:text-xl font-bold text-indigo-700">${precioMembresia}</span>
                    <button
                      onClick={() => setMembresia(!membresia)}
                      className={`relative inline-flex h-6 w-11 sm:h-8 sm:w-14 items-center rounded-full transition-colors ${
                        membresia ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 sm:h-6 sm:w-6 transform rounded-full bg-white transition-transform ${
                          membresia ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nota de bloqueo si no hay membresía */}
              {!canSelectExtras && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-amber-800 font-medium">
                    Debes activar la membresía básica para añadir servicios extra
                  </p>
                </div>
              )}

              {/* Marca Pro */}
              <div className={`bg-white rounded-lg p-3 border border-purple-200 ${!canSelectExtras ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      Marca Pro
                      {!canSelectExtras && <Lock className="w-4 h-4 text-slate-400" />}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Personaliza con tu logo y elimina la marca Mocha</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-lg sm:text-xl font-bold text-purple-600">${precioBranding}</span>
                    <button
                      onClick={() => handleToggleExtra(setMarcaPro, marcaPro)}
                      disabled={!canSelectExtras}
                      className={`relative inline-flex h-6 w-11 sm:h-8 sm:w-14 items-center rounded-full transition-colors ${
                        marcaPro && canSelectExtras ? 'bg-purple-600' : 'bg-slate-300'
                      } ${!canSelectExtras ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 sm:h-6 sm:w-6 transform rounded-full bg-white transition-transform ${
                          marcaPro && canSelectExtras ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ofertas Premium */}
              <div className={`bg-white rounded-lg p-3 border border-purple-200 ${!canSelectExtras ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      Ofertas Premium
                      {!canSelectExtras && <Lock className="w-4 h-4 text-slate-400" />}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Crea ofertas especiales y descuentos destacados</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-lg sm:text-xl font-bold text-purple-600">${precioExtraProductos}</span>
                    <button
                      onClick={() => handleToggleExtra(setOfertas, ofertas)}
                      disabled={!canSelectExtras}
                      className={`relative inline-flex h-6 w-11 sm:h-8 sm:w-14 items-center rounded-full transition-colors ${
                        ofertas && canSelectExtras ? 'bg-purple-600' : 'bg-slate-300'
                      } ${!canSelectExtras ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 sm:h-6 sm:w-6 transform rounded-full bg-white transition-transform ${
                          ofertas && canSelectExtras ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 sm:p-4 text-white">
              <div className="flex justify-between items-center">
                <span className="text-base sm:text-lg font-semibold">Total a Pagar:</span>
                <span className="text-2xl sm:text-3xl font-bold">${total} USD</span>
              </div>
              {total === 0 && (
                <p className="text-purple-100 text-xs sm:text-sm mt-2">Selecciona al menos un servicio</p>
              )}
            </div>
          </div>

          {/* 2. Wompi - Pago con Tarjeta */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Pago con Tarjeta (Wompi)</h3>
            </div>
            
            <div className="bg-white rounded-lg p-3 sm:p-4 space-y-4">
              {/* QR Wompi */}
              <div className="flex justify-center">
                {wompiQrUrl ? (
                  <img
                    src={wompiQrUrl}
                    alt="QR Wompi"
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-lg border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 bg-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-300">
                    <div className="text-center">
                      <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-purple-500">QR de Wompi</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Botón Pagar con Wompi */}
              {wompiLink ? (
                <a
                  href={wompiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold text-sm sm:text-base hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <CreditCard className="w-5 h-5" />
                  Pagar con Wompi (Tarjeta)
                </a>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-500 rounded-xl font-bold text-sm sm:text-base cursor-not-allowed">
                  <CreditCard className="w-5 h-5" />
                  Link de pago no configurado
                </div>
              )}
              
              <p className="text-center text-xs text-slate-500">
                Paga de forma segura con tu tarjeta de débito o crédito
              </p>
            </div>
          </div>

          {/* 3. Datos de Pago Cripto */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Pago con Criptomonedas</h3>
            </div>

            {/* USDT (TRC-20) */}
            <div className="bg-white rounded-lg p-3 sm:p-4 mb-3">
              <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-2">USDT (TRC-20)</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                  <p className="text-xs sm:text-sm font-mono truncate">{usdtAddress}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(usdtAddress, setCopiedUSDT)}
                  className="flex-shrink-0 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  title="Copiar dirección USDT"
                >
                  {copiedUSDT ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-lg p-3 sm:p-4 mb-3">
              <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-3">Código QR USDT</h4>
              <div className="flex justify-center">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="QR USDT"
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-lg border-2 border-slate-300"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                    <div className="text-center">
                      <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-slate-500">QR de pago USDT</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Binance Pay */}
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-2">Binance Pay</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                  <p className="text-xs sm:text-sm font-mono truncate">{binanceId}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(binanceId, setCopiedBinance)}
                  className="flex-shrink-0 p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all"
                  title="Copiar Binance ID"
                >
                  {copiedBinance ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Binance ID para pagos directos</p>
            </div>
          </div>

          {/* 4. Confirmación */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Confirmación de Pago</h3>

            {/* Subir Comprobante */}
            <div className="bg-white rounded-lg p-3 sm:p-4 mb-3">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-3">
                Subir Comprobante de Pago
              </label>
              
              {receiptPreview ? (
                <div className="space-y-3">
                  <div className="relative w-full max-w-xs mx-auto">
                    <img
                      src={receiptPreview}
                      alt="Comprobante"
                      className="w-full rounded-lg border-2 border-orange-200"
                    />
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                    <div className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium text-center text-sm">
                      Cambiar Comprobante
                    </div>
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 sm:p-8 text-center hover:border-orange-400 transition-all">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                    </div>
                    <p className="text-orange-600 font-semibold text-sm sm:text-base mb-1">Haz clic para subir</p>
                    <p className="text-xs text-slate-500">Captura de pantalla del pago (PNG, JPG, max 10MB)</p>
                  </div>
                </label>
              )}
            </div>

            {/* Botón Notificar Pago */}
            <button
              onClick={handleNotificarPago}
              disabled={total === 0 || !receiptFile}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-base sm:text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              Notificar Pago por WhatsApp
            </button>
            <p className="text-center text-xs text-slate-500 mt-2 sm:mt-3">
              Se abrirá WhatsApp con el detalle de tu pago
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
