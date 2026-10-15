/**
 * Challenge (2FA) display metadata — pure mapping from challenge
 * type + provider to UI copy.
 */
export interface ChallengeDisplay {
    title: string;
    description: string;
    method: string;
}

export function getChallengeDisplayName(
    type: string | null,
    prov: string,
    message?: string | null,
): ChallengeDisplay {
    const isGithub = prov === "GITHUB";
    const isOffice = prov === "OFFICE";

    switch (type) {
        case "PUSH":
            return {
                title: isGithub ? "Check GitHub Mobile" : "Check your phone",
                description:
                    message ||
                    (isGithub
                        ? "We sent a request to your GitHub Mobile app. Enter the digits shown to verify."
                        : isOffice
                          ? "Open your Microsoft Authenticator app to approve the request."
                          : "Check your phone and tap 'Yes' on the Google prompt."),
                method: isGithub ? "GitHub Mobile" : isOffice ? "Authenticator App" : "Google Prompt",
            };
        case "EMAIL":
            return {
                title: "Check your email",
                description: message || "Verification required to protect your account",
                method: "Email Code",
            };
        case "BACKUP":
        case "RECOVERY_CODE":
            return {
                title: "Recovery Code",
                description: message || "Enter one of your 8-digit backup codes",
                method: "Recovery Code",
            };
        case "TOTP":
        case "APP":
            return {
                title: "Two-factor auth",
                description: message || "Enter the code from your Authenticator app",
                method: "Authenticator App",
            };
        case "SMS":
            return {
                title: "Verify your phone",
                description: message || "Enter the code sent to your phone",
                method: "SMS / Text Message",
            };
        default:
            return {
                title: "Two-factor auth",
                description: message || "Verification required to protect your account",
                method: type || "Verification Code",
            };
    }
}
