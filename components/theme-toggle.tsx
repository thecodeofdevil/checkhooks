"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "checkhooksTheme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("checkhooks-dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent("checkhooks-theme-change", { detail: theme }));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    setTheme(storedTheme);
    applyTheme(storedTheme);

    const syncTheme = () => {
      setTheme(window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
    };
    window.addEventListener("storage", syncTheme);
    window.addEventListener("checkhooks-theme-change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("checkhooks-theme-change", syncTheme);
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <Sun className={`h-4 w-4 ${isDark ? "opacity-40" : ""}`} />
      <span className={`theme-toggle-knob ${isDark ? "translate-x-6" : ""}`} />
      <Moon className={`h-4 w-4 ${isDark ? "" : "opacity-40"}`} />
    </button>
  );
}
