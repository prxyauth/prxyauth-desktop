/**
 * RegisterView - User Registration Interface
 */

import { Building2 } from "lucide-react";
import { RegisterForm } from "./components/RegisterForm";

interface RegisterViewProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterView({
  onRegisterSuccess,
  onSwitchToLogin,
}: RegisterViewProps) {
  return (
    <div className="min-h-screen relative flex flex-col py-12 px-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mb-10 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase">
            Create <span className="text-primary italic">Account</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto font-medium">
            Set up your organization and start managing browser sessions with
            PRXY PRO.
          </p>
        </div>

        <RegisterForm
          onSuccess={onRegisterSuccess}
          onSwitchToLogin={onSwitchToLogin}
        />

        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 max-w-[240px] mx-auto leading-relaxed">
            Proprietary Encryption • TLS 1.3 • AES-256-GCM
          </p>
        </div>
      </div>
    </div>
  );
}
