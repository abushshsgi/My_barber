"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { CreateSalonPage } from "@/components/salon/CreateSalonPage";

export default function Page() {
  const sp = useSearchParams();
  const preset = (sp.get("preset") || "").toLowerCase();
  const isMybarber = preset === "mybarber";

  const [initialSalonName, setInitialSalonName] = useState("");
  const [lockSalonName, setLockSalonName] = useState(false);
  const [initialAddress, setInitialAddress] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [initialLat, setInitialLat] = useState("");
  const [initialLng, setInitialLng] = useState("");
  const [prefillKey, setPrefillKey] = useState(0);

  useEffect(() => {
    // Prefill barber name + location from backend profile (signup step-2 saved it).
    const run = async () => {
      const meRes = await apiFetch("/api/v1/barber/auth/me/");
      if (meRes.ok) {
        const me = (await meRes.json()) as { full_name?: string };
        const fn = (me.full_name || "").trim();
        if (isMybarber && fn) {
          setInitialSalonName((prev) => prev || `MyBarber · ${fn}`);
          setLockSalonName(true);
        }
      }
      const profRes = await apiFetch("/api/v1/barber/profile/");
      if (profRes.ok) {
        const p = (await profRes.json()) as {
          location_text?: string;
          latitude?: string | null;
          longitude?: string | null;
          phone?: string | null;
        };
        if (p.location_text) setInitialAddress((prev) => prev || p.location_text);
        if (p.latitude) setInitialLat((prev) => prev || String(p.latitude));
        if (p.longitude) setInitialLng((prev) => prev || String(p.longitude));
        if (p.phone) setInitialPhone((prev) => prev || String(p.phone));
      }

      // Ensure `CreateSalonPage` re-mounts with updated initials.
      setPrefillKey((k) => k + 1);
    };
    void run();
  }, [isMybarber]);

  return (
    <CreateSalonPage
      key={prefillKey}
      preset={preset}
      initialSalonName={initialSalonName}
      lockSalonName={lockSalonName}
      initialAddress={initialAddress}
      initialPhone={initialPhone}
      initialLat={initialLat}
      initialLng={initialLng}
    />
  );
}

