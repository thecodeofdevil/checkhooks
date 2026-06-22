import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Checkhooks — Catch requests. Shape responses.",
    template: "%s · Checkhooks",
  },
  description: "A temporary request lab for catching events, shaping dynamic responses, and testing integrations without account setup.",
  applicationName: "Checkhooks",
  keywords: ["checkhook testing", "request inspector", "API testing", "dynamic responses", "developer tools"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("checkhooksTheme");if(t==="dark"){document.documentElement.classList.add("checkhooks-dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.style.colorScheme="light";}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
