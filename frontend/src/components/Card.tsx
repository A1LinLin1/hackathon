// src/components/Card.tsx
import React from 'react'
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6">
      {children}
    </div>
  )
}

