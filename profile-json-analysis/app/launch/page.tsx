"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User, Key, ChevronDown, ArrowRight, Bot, Link } from "lucide-react"

export default function LaunchPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    username: "",
    token: "",
    timezone: "Asia/Shanghai",
    window: "year",
    deepScan: true,
    // AI 配置
    aiApiKey: "",
    aiBaseUrl: "",
    aiModel: "gpt-4o-mini",
  })
  const [showAiConfig, setShowAiConfig] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Store form data in sessionStorage for the processing page
    sessionStorage.setItem("devhunt-config", JSON.stringify(form))
    router.push("/processing")
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
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <Image
              src="/images/gemini-generated-image-pxdy7lpxdy7lpxdy.jpeg"
              alt="DevHunt"
              width={64}
              height={64}
              className="rounded-2xl shadow-2xl shadow-accent/20"
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">DevHunt Console</h1>
          <p className="text-muted-foreground text-sm">Enter parameters to initiate target analysis.</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-1 shadow-2xl">
            <form onSubmit={handleSubmit} className="bg-background/50 rounded-xl p-6 space-y-5">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1">
                  Target Username
                </label>
                <div className="input-group flex items-center bg-secondary border border-border rounded-lg px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_2px_rgba(217,119,87,0.2)]">
                  <User className="w-4 h-4 text-muted-foreground transition-colors" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. yyx990803"
                    required
                    className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 py-3 pl-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Token Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1 flex justify-between">
                  GitHub Token
                  {!form.token && (
                    <span className="text-[10px] text-muted-foreground/60 normal-case">(Using ENV if empty)</span>
                  )}
                </label>
                <div className="input-group flex items-center bg-secondary border border-border rounded-lg px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_2px_rgba(217,119,87,0.2)]">
                  <Key className="w-4 h-4 text-muted-foreground transition-colors" />
                  <input
                    type="password"
                    value={form.token}
                    onChange={(e) => setForm({ ...form, token: e.target.value })}
                    placeholder="ghp_..."
                    className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 py-3 pl-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Timezone Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase ml-1">Region</label>
                  <div className="relative">
                    <select
                      value={form.timezone}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg text-xs text-foreground py-2.5 pl-3 pr-8 appearance-none focus:border-accent focus:ring-0 transition-colors outline-none"
                    >
                      <option value="Asia/Shanghai">Asia/Shanghai</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">New York</option>
                      <option value="Europe/London">London</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Deep Scan Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase ml-1">Mode</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, deepScan: !form.deepScan })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 bg-secondary border rounded-lg text-xs transition-all ${
                      form.deepScan
                        ? "border-accent text-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    <span>Deep Scan</span>
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${
                        form.deepScan ? "bg-accent shadow-[0_0_8px_rgba(217,119,87,0.6)]" : "bg-muted-foreground/60"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* AI Configuration Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAiConfig(!showAiConfig)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5" />
                    AI Narrative Configuration
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAiConfig ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* AI Configuration Panel */}
              {showAiConfig && (
                <div className="space-y-4 p-4 bg-secondary/30 border border-border/50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] text-muted-foreground">
                    Configure your LLM API to enable AI-powered profile narrative generation.
                  </p>
                  
                  {/* AI Base URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase ml-1 flex justify-between">
                      API Base URL
                      <span className="text-[10px] text-muted-foreground/60 normal-case">(Optional)</span>
                    </label>
                    <div className="input-group flex items-center bg-secondary border border-border rounded-lg px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_2px_rgba(217,119,87,0.2)]">
                      <Link className="w-4 h-4 text-muted-foreground transition-colors" />
                      <input
                        type="text"
                        value={form.aiBaseUrl}
                        onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 py-2.5 pl-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* AI API Key */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase ml-1">
                      API Key
                    </label>
                    <div className="input-group flex items-center bg-secondary border border-border rounded-lg px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_2px_rgba(217,119,87,0.2)]">
                      <Key className="w-4 h-4 text-muted-foreground transition-colors" />
                      <input
                        type="password"
                        value={form.aiApiKey}
                        onChange={(e) => setForm({ ...form, aiApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 py-2.5 pl-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* AI Model Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase ml-1">Model</label>
                    <div className="relative">
                      <select
                        value={form.aiModel}
                        onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg text-xs text-foreground py-2.5 pl-3 pr-8 appearance-none focus:border-accent focus:ring-0 transition-colors outline-none"
                      >
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        <option value="deepseek-chat">DeepSeek Chat</option>
                        <option value="qwen-turbo">Qwen Turbo</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!form.username}
                className="w-full mt-4 py-3.5 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg shadow-lg shadow-accent/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="text-sm">Initialize Protocol</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-muted-foreground/60">
            DEVHUNT CLI v0.1.0 • SECURE CONNECTION
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-group:focus-within :global(svg) {
          color: hsl(var(--accent));
        }
      `}</style>
    </div>
  )
}
