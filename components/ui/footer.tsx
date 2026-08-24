"use client"

import React from "react"

export default function Footer() {
  return (
    <footer className="fixed bottom-0 w-full py-2 text-center text-[10px] font-black uppercase tracking-[0.3em] text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 z-5 shadow-[0_-4px_20px_rgba(124,58,237,0.1)]">
      <a 
        href="https://www.botivate.in/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:underline transition-all duration-300"
      >
        POWERED BY BOTIVATE
      </a>
    </footer>
  )
}
