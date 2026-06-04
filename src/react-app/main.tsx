import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// GLOBAL REFERRAL CAPTURE - Runs immediately on any page load
// Check ALL possible URL patterns for referral code
const captureReferral = () => {
  const urlParams = new URLSearchParams(window.location.search);
  // Check both 'ref' and 'referral' parameters
  const refCode = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('referido');
  
  if (refCode && refCode.trim() !== '') {
    localStorage.setItem('referral_id', refCode.trim());
    console.log('[REFERRAL GLOBAL] Saved to localStorage:', refCode);
  }
};

// Execute capture immediately
captureReferral();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
