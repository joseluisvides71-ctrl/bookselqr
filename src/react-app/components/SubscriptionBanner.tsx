import { AlertCircle, Sparkles, Calendar, CreditCard, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { ActivatePlanModal } from './ActivatePlanModal';

interface SubscriptionBannerProps {
  productsCount: number;
  productsRemaining: number;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  canGenerate: boolean;
  membershipStatus: 'trial' | 'active' | 'expired';
  membershipExpiration?: string;
  isMembershipExpired: boolean;
  phoneNumber?: string;
  countryCode?: string;
  whatsappConfigured?: boolean;
}

export function SubscriptionBanner({
  productsCount,
  trialDaysRemaining,
  isTrialExpired,
  canGenerate,
  membershipStatus,
  membershipExpiration,
  isMembershipExpired,
  whatsappConfigured,
}: SubscriptionBannerProps) {
  const [showActivatePlanModal, setShowActivatePlanModal] = useState(false);

  const handleOpenPaymentModal = () => {
    setShowActivatePlanModal(true);
  };

  // Calculate days until expiration
  const getDaysUntilExpiration = () => {
    if (!membershipExpiration) return null;
    const expirationDate = new Date(membershipExpiration);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  // WhatsApp not configured warning
  if (!whatsappConfigured) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">
              ⚠️ Configura tu número para recibir pedidos
            </h3>
            <p className="text-sm text-slate-600">
              Los clientes necesitan tu número de WhatsApp para enviarte pedidos. 
              <a href="/profile" className="text-amber-600 hover:text-amber-700 font-semibold ml-1">
                Configurar ahora →
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Expiration warning banner (2 days or less)
  if (membershipStatus === 'active' && membershipExpiration && daysUntilExpiration !== null && daysUntilExpiration <= 2 && daysUntilExpiration >= 0) {
    return (
      <>
        <div 
          onClick={handleOpenPaymentModal}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 mb-6 cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="font-bold text-lg">
                ⚠️ Tu plan vence en {daysUntilExpiration} {daysUntilExpiration === 1 ? 'día' : 'días'}. Haz clic aquí para renovar y no perder tus ventas
              </p>
            </div>
          </div>
        </div>
        <ActivatePlanModal
          isOpen={showActivatePlanModal}
          onClose={() => setShowActivatePlanModal(false)}
          storeName=""
          userEmail=""
        />
      </>
    );
  }

  // Active paid membership (more than 2 days remaining)
  if (membershipStatus === 'active' && membershipExpiration) {
    const expirationDate = new Date(membershipExpiration);
    const formattedDate = expirationDate.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">
              Membresía Activa
            </h3>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tu acceso ilimitado vence el <span className="font-bold text-emerald-600">{formattedDate}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Free trial - product limit reached
  if (membershipStatus === 'trial' && !canGenerate && !isTrialExpired && productsCount >= 5) {
    return (
      <>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                Has alcanzado el límite de tu prueba gratuita
              </h3>
              <p className="text-slate-700 mb-4">
                Ya tienes <span className="font-bold text-amber-600">5 productos</span> en tu catálogo. 
                Pasa al plan Pro por solo $15.00 por 3 meses para obtener productos ilimitados.
              </p>
              <button
                onClick={handleOpenPaymentModal}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              >
                <CreditCard className="w-6 h-6" />
                Ver Información de Pago
              </button>
            </div>
          </div>
        </div>
        <ActivatePlanModal
          isOpen={showActivatePlanModal}
          onClose={() => setShowActivatePlanModal(false)}
          storeName=""
          userEmail=""
        />
      </>
    );
  }

  // Free trial active
  if (membershipStatus === 'trial' && canGenerate && !isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">
              Prueba Gratuita Activa
            </h3>
            <p className="text-sm text-slate-600">
              Has usado <span className="font-bold text-indigo-600">{productsCount} de 5</span> productos permitidos.
              {' '}Te quedan <span className="font-bold">{trialDaysRemaining} días</span> de prueba gratuita.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Membership expired (renewal needed - $2 monthly)
  if (membershipStatus === 'expired' && isMembershipExpired) {
    return (
      <>
        <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                Tu suscripción ha vencido
              </h3>
              <p className="text-slate-700 mb-4">
                Renueva tu acceso ilimitado por solo $2.00 al mes
              </p>
              <button
                onClick={handleOpenPaymentModal}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              >
                <CreditCard className="w-6 h-6" />
                Ver Información de Pago
              </button>
            </div>
          </div>
        </div>
        <ActivatePlanModal
          isOpen={showActivatePlanModal}
          onClose={() => setShowActivatePlanModal(false)}
          storeName=""
          userEmail=""
        />
      </>
    );
  }

  // Trial expired (initial payment needed - $15 for 3 months)
  return (
    <>
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              Tu prueba gratuita ha finalizado
            </h3>
            <p className="text-slate-700 mb-4">
              Activa tu acceso ilimitado por solo $15.00 por 3 meses
            </p>
            <button
              onClick={handleOpenPaymentModal}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
            >
              <CreditCard className="w-6 h-6" />
              Ver Información de Pago
            </button>
          </div>
        </div>
      </div>
      <ActivatePlanModal
        isOpen={showActivatePlanModal}
        onClose={() => setShowActivatePlanModal(false)}
        storeName=""
        userEmail=""
      />
    </>
  );
}
