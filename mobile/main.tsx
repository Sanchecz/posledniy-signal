import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@capacitor/app";
import { GameApp } from "../app/GameApp";
import "../app/globals.css";

document.documentElement.dataset.native = "android";

function AndroidShell() {
  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    void App.addListener("backButton", () => {
      const event = new CustomEvent("last-signal:native-back", { cancelable: true });
      const shouldExit = window.dispatchEvent(event);
      if (shouldExit) void App.exitApp();
    }).then((handle) => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, []);

  return <GameApp />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Android application root is missing.");

createRoot(root).render(
  <StrictMode>
    <AndroidShell />
  </StrictMode>,
);
