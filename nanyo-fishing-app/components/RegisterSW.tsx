"use client";

import { useEffect } from "react";
import { withBase } from "@/lib/paths";

export default function RegisterSW() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register(withBase("/sw.js"), { scope: withBase("/") })
        .catch(() => {});
    }
  }, []);
  return null;
}
