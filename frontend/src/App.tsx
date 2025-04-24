// src/App.tsx
import React from "react";
// ConnectButton 和 useWallet 都要从 @suiet/wallet-kit 拿
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import AuditPage from "./components/AuditPage";

export default function App() {
  const { account, disconnect } = useWallet();

  return (
    <div className="p-4 space-y-4">
      <ConnectButton />
      {account && (
        <>
          <div>已连接：{account.address}</div>
          <button onClick={disconnect} className="underline">
            断开钱包
          </button>
          <AuditPage />
        </>
      )}
    </div>
  );
}

