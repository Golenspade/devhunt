"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ProcessingPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [username, setUsername] = useState("")
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    // Retrieve config from sessionStorage
    const configStr = sessionStorage.getItem("devhunt-config")
    if (!configStr) {
      router.push("/launch")
      return
    }

    const config = JSON.parse(configStr)
    setUsername(config.username)

    // 调用真实的后端 API
    const runAnalysis = async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: config.username,
            token: config.token,
            timezone: config.timezone,
            window: config.window,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to start analysis')
        }

        // 读取 Server-Sent Events 流
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))
              if (data.log) {
                setLogs((prev) => {
                  const newLogs = [...prev, data.log]
                  return newLogs.length > 10 ? newLogs.slice(-10) : newLogs
                })
              }
              if (data.done) {
                setIsProcessing(false)
                // 跳转到 dashboard
                setTimeout(() => {
                  router.push('/')
                }, 2000)
              }
            }
          }
        }
      } catch (error) {
        console.error('Analysis error:', error)
        setLogs((prev) => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
        setIsProcessing(false)
      }
    }

    runAnalysis()
  }, [router])

  const handleCancel = () => {
    sessionStorage.removeItem("devhunt-config")
    router.push("/launch")
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      />

      {/* Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(217, 119, 87, 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Animated Logo */}
          <div className="relative w-32 h-16 mb-12 animate-in fade-in zoom-in duration-700 flex items-center justify-center">
            <Image
              src="/images/gemini-generated-image-pxdy7lpxdy7lpxdy.jpeg"
              alt="DevHunt"
              width={128}
              height={64}
              className="rounded-2xl max-w-full max-h-full object-contain"
            />
            <div className="absolute inset-0 bg-accent blur-[60px] opacity-20 animate-pulse" />
          </div>

          {/* Status */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h2 className="text-xl font-medium text-foreground mb-2">Acquiring Target Data</h2>
            <div className="flex items-center justify-center gap-2 text-sm font-mono">
              <span className="text-accent animate-pulse">PROCESSING</span>
              <span className="text-muted-foreground">::</span>
              <span className="text-foreground">{username}</span>
            </div>
          </div>

          {/* Terminal */}
          <div className="w-full bg-black/50 backdrop-blur-sm rounded-xl border border-border p-4 font-mono text-[11px] h-40 relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            {/* Terminal Header */}
            <div className="flex justify-between items-center mb-3 opacity-40 px-1">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="text-[9px]">BASH</div>
            </div>

            {/* Log Output */}
            <div className="space-y-1.5 relative z-10">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-accent shrink-0">➜</span>
                  <span
                    className={i === logs.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground/70"}
                  >
                    {log}
                  </span>
                </div>
              ))}
              <div className="flex gap-2 items-center mt-1">
                <span className="text-accent shrink-0">➜</span>
                <span className="w-2 h-4 bg-accent animate-pulse" />
              </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </div>

          {/* Cancel Button */}
          <div className="mt-8 animate-in fade-in duration-500 delay-500">
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors font-mono border-b border-transparent hover:border-destructive pb-0.5"
            >
              ABORT OPERATION
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
