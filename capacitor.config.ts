import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sanchecz.lastsignal",
  appName: "Последний сигнал",
  webDir: "mobile-dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#07070c",
    webContentsDebuggingEnabled: false,
  },
};

export default config;
