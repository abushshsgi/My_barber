import { createFileRoute } from "@tanstack/react-router";
import { MyBarberSetupPage } from "@/components/salon/MyBarberSetupPage";

export const Route = createFileRoute("/mybarber/setup")({
  component: MyBarberSetupPage,
});
