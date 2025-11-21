"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function DevNav() {
  const pathname = usePathname()

  const pages = [
    { name: "Dashboard", path: "/" },
    { name: "Launch", path: "/launch" },
    { name: "Processing", path: "/processing" },
  ]

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2 rounded-lg border border-white/10 bg-[#1c1c21]/95 p-2 backdrop-blur-sm">
      {pages.map((page) => (
        <Link
          key={page.path}
          href={page.path}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === page.path ? "bg-[#d97757] text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          {page.name}
        </Link>
      ))}
    </div>
  )
}
