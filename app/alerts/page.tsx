import type { Metadata } from "next";
import { AlertsClient } from "@/components/alerts/alerts-client";

export const metadata: Metadata = {
  title: "Price alerts",
  description: "Create above/below price alerts on any ticker. Delivered by email and the in-app bell.",
};

export default function AlertsPage() {
  return <AlertsClient />;
}
