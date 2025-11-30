import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// 导入 agent 模块的函数
import {
  compressProfileForAI,
  buildSystemPrompt,
  buildUserPrompt,
} from "../../../../src/agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      login, 
      language = "zh", 
      style = "professional",
      // 用户自定义的 AI 配置
      aiApiKey,
      aiBaseUrl,
      aiModel,
    } = body;

    if (!login) {
      return NextResponse.json(
        { error: "Login is required" },
        { status: 400 }
      );
    }

    // 读取已生成的 profile.json
    const profilePath = join(process.cwd(), "..", "out", login, "profile.json");
    const profileData = await readFile(profilePath, "utf-8").then(JSON.parse);

    // 压缩数据供 AI 使用
    const compressed = compressProfileForAI(profileData);
    const systemPrompt = buildSystemPrompt({ language, style });
    const userPrompt = buildUserPrompt(profileData);

    // 优先使用用户传入的配置，其次使用环境变量
    const apiKey = aiApiKey || process.env.OPENAI_API_KEY;
    const baseUrl = aiBaseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = aiModel || process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      // 没有配置 API Key，返回 prompt 供客户端使用
      return NextResponse.json({
        mode: "prompt",
        systemPrompt,
        userPrompt,
        compressedProfile: compressed,
        message: "No OPENAI_API_KEY configured. Use the prompts with your own LLM.",
      });
    }

    // 调用 OpenAI API
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const narrative = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data.usage?.total_tokens;

    return NextResponse.json({
      mode: "narrative",
      narrative,
      tokensUsed,
      login,
    });
  } catch (error) {
    console.error("Error generating narrative:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative", details: String(error) },
      { status: 500 }
    );
  }
}
