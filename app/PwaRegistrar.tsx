"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    const isNativeContainer = document.documentElement.dataset.native === "android";
    if (
      process.env.NODE_ENV !== "production" ||
      isNativeContainer ||
      !("serviceWorker" in navigator)
    ) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The online game remains usable if service worker registration is unavailable.
      });
    };
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
