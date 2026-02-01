import { useEffect, useState } from "react";

export interface BrowserStatus {
  isInstalled: boolean;
  isDownloading: boolean;
  progress: { percent: number; message: string };
}

export function useBrowserStatus() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = (window as any).prxApi.browser;

  const checkStatus = async () => {
    try {
      const result = await api.getStatus();
      setStatus(result);
    } catch (err) {
      console.error("Failed to get browser status:", err);
      setError("Failed to connect to backend");
    }
  };

  const retry = async () => {
    setError(null);
    try {
      await api.install();
    } catch (err: any) {
      setError(err.message || "Failed to start installation");
    }
  };

  useEffect(() => {
    checkStatus();

    const cleanups = [
      api.onInstallStarted(() => {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                isDownloading: true,
                progress: { percent: 0, message: "Starting..." },
              }
            : null,
        );
      }),
      api.onInstallProgress(
        (progress: { percent: number; message: string }) => {
          setStatus((prev) =>
            prev ? { ...prev, isDownloading: true, progress } : null,
          );
        },
      ),
      api.onInstallSuccess(() => {
        setStatus((prev) =>
          prev ? { ...prev, isDownloading: false, isInstalled: true } : null,
        );
      }),
      api.onInstallFailed((err: any) => {
        setStatus((prev) => (prev ? { ...prev, isDownloading: false } : null));
        setError(
          err.error ||
            "Installation failed. Please check your internet connection.",
        );
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return { status, error, retry };
}
