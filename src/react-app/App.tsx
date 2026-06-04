import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import { CartProvider } from "@/react-app/hooks/useCart";
import Landing from "@/react-app/pages/Landing";
import HomePage from "@/react-app/pages/Home";
import StoreCatalog from "@/react-app/pages/StoreCatalog";
import AuthCallback from "@/react-app/pages/AuthCallback";
import ProfileSetup from "@/react-app/pages/ProfileSetup";
import Profile from "@/react-app/pages/Profile";
import Admin from "@/react-app/pages/Admin";

export default function App() {
  return (
    <div className="overflow-x-hidden w-full">
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/tienda/:storeName" element={<StoreCatalog />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
