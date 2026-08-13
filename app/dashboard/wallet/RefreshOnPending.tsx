"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// When the customer returns from Bonum's hosted page (?topup=pending), the
// crediting webhook may land a beat later. Re-fetch the server component a few
// times so the new balance + transaction row appear without a manual reload.
export default function RefreshOnPending() {
  const router = useRouter();
  useEffect(() => {
    const timers = [1500, 4000, 8000].map((ms) =>
      setTimeout(() => router.refresh(), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [router]);
  return null;
}
