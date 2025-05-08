// src/components/ThemeToggle.tsx
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

