// src/App.tsx
import './App.css'
import React from 'react'
import { useWallet, ConnectButton } from '@suiet/wallet-kit'
import { AuditPage } from './components/AuditPage'
import { Card } from './components/Card'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  const { account } = useWallet()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 顶部导航 */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            智能合约审计平台
          </h1>
          <div className="flex items-center space-x-4">
            <ConnectButton className="!px-4 !py-2" />
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!account ? (
          <div className="text-center text-gray-600 dark:text-gray-400 py-20">
            请先连接钱包以查看审计报告
          </div>
        ) : (
          <Card>
            <AuditPage />
          </Card>
        )}
      </main>
    </div>
  )
}

