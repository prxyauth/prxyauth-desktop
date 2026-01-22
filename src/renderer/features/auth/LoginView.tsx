/**
 * LoginView - Account Connection Interface
 */

import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./components/LoginForm";
import { LoginResponse } from "@core/types";

interface LoginViewProps {
  onLoginSuccess: (response: LoginResponse) => void;
  onSwitchToRegister: () => void;
}

export function LoginView({
  onLoginSuccess,
  onSwitchToRegister,
}: LoginViewProps) {
  return (
    <div className="min-h-screen relative flex flex-col py-12 px-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mb-10 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase">
            PRXY PRO <span className="text-primary italic">Login</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto font-medium">
            Access your secure browser infrastructure and manage automated
            sessions.
          </p>
        </div>

        <LoginForm
          onSuccess={onLoginSuccess}
          onSwitchToRegister={onSwitchToRegister}
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
