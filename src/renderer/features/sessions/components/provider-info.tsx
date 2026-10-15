/**
 * Provider display metadata — name, accent color, icon.
 */
import { Database, Key, Mail, type LucideIcon } from "lucide-react";

export interface ProviderInfo {
    name: string;
    color: string;
    Icon: LucideIcon;
}

export function getProviderInfo(provider?: string): ProviderInfo {
    switch (provider) {
        case "GOOGLE":
            return { name: "Google", color: "text-primary", Icon: Mail };
        case "OFFICE":
            return { name: "Microsoft 365", color: "text-emerald-500", Icon: Database };
        case "GITHUB":
            return { name: "GitHub", color: "text-gray-400", Icon: Key };
        case "FACEBOOK":
            return { name: "Facebook", color: "text-primary", Icon: Mail };
        default:
            return { name: "Unknown", color: "text-gray-400", Icon: Key };
    }
}
