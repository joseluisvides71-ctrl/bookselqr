import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phoneNumber: string;
  countryCode: string;
}

export function WhatsAppButton({ phoneNumber, countryCode }: WhatsAppButtonProps) {
  const handleClick = () => {
    // Remove any non-numeric characters
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const cleanCountry = countryCode.replace(/\D/g, '');
    
    // Create WhatsApp link with country code + phone
    const whatsappNumber = `${cleanCountry}${cleanPhone}`;
    const message = '¡Hola! Tengo una consulta sobre los productos de tu catálogo';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 left-8 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center z-[100] group"
      title="Consultar por WhatsApp"
    >
      <MessageCircle className="w-8 h-8" strokeWidth={2} fill="currentColor" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20"></span>
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Consultar por WhatsApp
      </span>
    </button>
  );
}
