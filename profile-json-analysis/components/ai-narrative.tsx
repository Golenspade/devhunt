"use client"

import { useState } from "react"
import { Bot, Sparkles, Loader2, Copy, Check, ChevronDown, Key, Link } from "lucide-react"

interface AINarrativeProps {
  login: string
}

export function AINarrative({ login }: AINarrativeProps) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  
  // AI 配置状态
  const [aiConfig, setAiConfig] = useState({
    apiKey: "",
    baseUrl: "",
    model: "gpt-4o-mini",
    language: "zh" as "zh" | "en",
    style: "professional" as "professional" | "casual" | "brief",
  })

  // 从 sessionStorage 获取配置（如果有）
  useState(() => {
    if (typeof window !== "undefined") {
      const configStr = sessionStorage.getItem("devhunt-config")
      if (configStr) {
        const config = JSON.parse(configStr)
        if (config.aiApiKey || config.aiBaseUrl || config.aiModel) {
          setAiConfig(prev => ({
            ...prev,
            apiKey: config.aiApiKey || "",
            baseUrl: config.aiBaseUrl || "",
            model: config.aiModel || "gpt-4o-mini",
          }))
        }
      }
    }
  })

  const generateNarrative = async () => {
    if (!aiConfig.apiKey && !aiConfig.baseUrl) {
      setShowConfig(true)
      setError("请先配置 AI API Key")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          language: aiConfig.language,
          style: aiConfig.style,
          aiApiKey: aiConfig.apiKey,
          aiBaseUrl: aiConfig.baseUrl,
          aiModel: aiConfig.model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate narrative")
      }

      if (data.mode === "narrative") {
        setNarrative(data.narrative)
      } else if (data.mode === "prompt") {
        setError("未配置 API Key，请在下方配置")
        setShowConfig(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (narrative) {
      await navigator.clipboard.writeText(narrative)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI Profile Narrative</h3>
            <p className="text-xs text-muted-foreground">AI-powered developer profile summary</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
        >
          <span>Settings</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* AI Configuration Panel */}
      {showConfig && (
        <div className="mb-4 p-4 bg-secondary/30 border border-border/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* API Base URL */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">API Base URL</label>
              <div className="flex items-center bg-background border border-border rounded-lg px-3">
                <Link className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-transparent border-none text-sm py-2 pl-2 outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">API Key</label>
              <div className="flex items-center bg-background border border-border rounded-lg px-3">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-transparent border-none text-sm py-2 pl-2 outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Model */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">Model</label>
              <select
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                className="w-full bg-background border border-border rounded-lg text-xs py-2 px-3 outline-none text-foreground"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="qwen-turbo">Qwen Turbo</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">Language</label>
              <select
                value={aiConfig.language}
                onChange={(e) => setAiConfig({ ...aiConfig, language: e.target.value as "zh" | "en" })}
                className="w-full bg-background border border-border rounded-lg text-xs py-2 px-3 outline-none text-foreground"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Style */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">Style</label>
              <select
                value={aiConfig.style}
                onChange={(e) => setAiConfig({ ...aiConfig, style: e.target.value as "professional" | "casual" | "brief" })}
                className="w-full bg-background border border-border rounded-lg text-xs py-2 px-3 outline-none text-foreground"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="brief">Brief</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Narrative Content */}
      {narrative ? (
        <div className="relative">
          <div className="prose prose-invert prose-sm max-w-none p-4 bg-secondary/30 rounded-xl border border-border/50">
            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{narrative}</p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={generateNarrative}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Regenerate
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={generateNarrative}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all flex items-center justify-center gap-2 text-foreground disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating narrative...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Generate AI Narrative</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
