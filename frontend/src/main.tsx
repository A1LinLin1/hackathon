// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Suiet Wallet Kit Provider（包名一定是 @suiet/wallet-kit）
import { WalletProvider } from "@suiet/wallet-kit";
// 样式也要从 @suiet/wallet-kit 拿
import "@suiet/wallet-kit/style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider defaultChain="testnet">
      <App />
    </WalletProvider>
  </React.StrictMode>
);

