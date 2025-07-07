import { useContext } from "react";
import { ThemeContext } from "./App";
import { Button } from "@/components/ui/button";

export const GrandChildComponent = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "GrandChildComponent must be used within a ThemeContext.Provider"
    );
  }

  const { darkTheme, setDarkTheme } = context;
  return (
    <>
      <div>The theme is {darkTheme ? "dark" : "light"}</div>
      <Button
        className={
          darkTheme
            ? "bg-white text-black w-200 h-50"
            : "bg-black text-white w-200 h-50"
        }
        onClick={() => setDarkTheme(!darkTheme)}
      >
        Toggle Theme
      </Button>
    </>
  );
};
