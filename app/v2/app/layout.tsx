import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace V2",
  description: "The extended Checkhooks workspace for reusable requests and receiver workflows.",
};

export default function V2AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
