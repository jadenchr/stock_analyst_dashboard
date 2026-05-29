import type { Metadata } from "next";
import { EarningsClient } from "@/components/earnings/earnings-client";

export const metadata: Metadata = {
  title: "Earnings calendar",
  description: "Upcoming earnings reports with EPS and revenue estimates.",
};

export default function EarningsPage() {
  return <EarningsClient />;
}
