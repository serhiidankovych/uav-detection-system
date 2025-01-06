import { ModelProvider } from "../context/ModelContext";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/Header";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ModelProvider>
      <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-blue-100 font-mono">
        <Header />
        <Component {...pageProps} />
      </div>
    </ModelProvider>
  );
}
