import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ConsentValue = "accepted" | "declined";

const STORAGE_KEY = "slk_cookie_consent_v1";

function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(v: ConsentValue) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore
  }
}

const CookieBanner = () => {
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const isOpen = useMemo(() => consent == null, [consent]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:p-0">
      <div className="w-full sm:w-[420px] max-w-full border border-border bg-[#f2eee6] bg-[length:4px_4px] bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)]">
        <div className="m-3 border border-border bg-secondary p-4 flex flex-col gap-4">
          <div className="min-w-0">
            <div className="font-heading font-bold text-foreground">Cookies</div>
            <p className="text-sm text-foreground/90 mt-1">
              Používame nevyhnutné cookies pre správne fungovanie webu. Voliteľné cookies (napr. analytika) môžete
              odmietnuť.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="bg-secondary"
              onClick={() => {
                writeConsent("declined");
                setConsent("declined");
              }}
            >
              Odmietnuť
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/95"
              onClick={() => {
                writeConsent("accepted");
                setConsent("accepted");
              }}
            >
              Prijať
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;

