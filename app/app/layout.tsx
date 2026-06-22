import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Receiver & Sender",
  description: "Catch requests, inspect payloads, and shape dynamic responses in a temporary Checkhooks workspace.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
