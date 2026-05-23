import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { DashboardScreen } from "./src/screens/DashboardScreen";

function useWebChromePolish() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const styleId = "tuneboss-web-chrome-polish";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      html, body, #root {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      * {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      *::-webkit-scrollbar {
        display: none !important;
        height: 0 !important;
        width: 0 !important;
      }

      ::selection {
        background: rgba(237, 108, 5, 0.92);
        color: #ffffff;
      }

      ::-moz-selection {
        background: rgba(237, 108, 5, 0.92);
        color: #ffffff;
      }

      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      textarea:-webkit-autofill,
      textarea:-webkit-autofill:hover,
      textarea:-webkit-autofill:focus {
        -webkit-background-clip: text !important;
        -webkit-box-shadow: 0 0 0 1000px #111111 inset !important;
        -webkit-text-fill-color: #ffffff !important;
        caret-color: #ffffff !important;
        transition: background-color 9999s ease-in-out 0s !important;
      }

      input[data-autocompleted],
      input:-internal-autofill-selected {
        appearance: none !important;
        background-color: #111111 !important;
        color: #ffffff !important;
      }
    `;

    // PWA meta tags
    const head = document.head;
    const tags = [
      ["meta", { name: "mobile-web-app-capable", content: "yes" }],
      ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
      ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }],
      ["meta", { name: "apple-mobile-web-app-title", content: "TuneBoss" }],
      ["meta", { name: "theme-color", content: "#ed6c05" }],
      ["link", { rel: "apple-touch-icon", href: "/icons/icon-192.png" }],
      ["link", { rel: "manifest", href: "/manifest.json" }],
    ];

    tags.forEach(([tag, attrs]) => {
      const el = document.createElement(tag as string);
      Object.entries(attrs as Record<string, string>).forEach(([k, v]) => el.setAttribute(k, v));
      head.appendChild(el);
    });
  }, []);
}

function useServiceWorker() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
}

export default function App() {
  useWebChromePolish();
  useServiceWorker();

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor="#070707" />
      <DashboardScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#070707",
  },
});
