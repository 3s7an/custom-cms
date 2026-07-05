import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SEED_ADMIN_EMAIL = "admin@example.com";

function resolveAdminLoginEmail(input: string): string {
  const t = input.trim();
  if (t.includes("@")) return t;
  if (t.toLowerCase() === "admin") {
    const fromEnv = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined;
    return (fromEnv && fromEnv.trim()) || DEFAULT_SEED_ADMIN_EMAIL;
  }
  return t;
}

const AdminLogin = () => {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const email = resolveAdminLoginEmail(loginId);
    const { error: signError } = await signIn(email, password);
    if (signError) {
      setError("Nesprávne prihlasovacie údaje");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      await signOut();
      setError("Nepodarilo sa načítať reláciu");
      setLoading(false);
      return;
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!adminRow) {
      await signOut();
      setError("Tento účet nemá prístup do administrácie");
      setLoading(false);
      return;
    }

    navigate("/admin");
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto min-h-screen mt-[20px]">
        <div className="shadow-lg bg-background min-h-[calc(100vh-20px)] flex items-center justify-center">
          <div className="w-full max-w-md bg-card p-8 border border-border">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-6 text-center">
              Admin prihlásenie
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="loginId">Email alebo používateľské meno</Label>
                <Input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Heslo</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Prihlasujem..." : "Prihlásiť sa"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
