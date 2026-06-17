import { createFileRoute } from "@tanstack/react-router";
import { MyBarberSetupPage } from "@/components/salon/MyBarberSetupPage";
import { ensureBarberSignupAccess } from "@/lib/auth-guard";

export const Route = createFileRoute("/mybarber/setup")({
  beforeLoad: ensureBarberSignupAccess,
  component: MyBarberSetupPage,
});
