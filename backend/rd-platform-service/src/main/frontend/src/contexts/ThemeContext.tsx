import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeContextType { theme: Theme; setTheme: (t: Theme) => void; }

const ThemeContext = createContext<ThemeContextType>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "light" }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("taiyi_theme") as Theme) || defaultTheme);

  useEffect(() => {
    localStorage.setItem("taiyi_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
