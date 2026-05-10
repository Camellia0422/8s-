/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { ScriptStyle, ScriptSegment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateScript(text: string, style: ScriptStyle): Promise<ScriptSegment[]> {
  const STYLE_PROMPTS = {
    "cinematic": "电影感，注重史诗感、大场景和视觉张力。",
    "animation": "二次元动漫风格，色彩鲜明，动作夸张且富有张力。",
    "vlog": "生活化 Vlog 风格，自然写实，注重亲和力与节奏感。",
    "suspense": "悬疑风格，阴影深重，运镜诡秘，营造紧张感。"
  };
  
  const stylePrompt = STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS];
  const prompt = `
    你是一个专业的短视频分镜脚本专家。请将以下中文小说片段转化为一系列 8 秒左右的短视频脚本。
    
    小说内容：
    """
    ${text}
    """
    
    风格要求：${stylePrompt}
    
    请遵循以下要求：
    1. 按语义和节奏对文本进行切分，每段预估时长在 6-10 秒之间（目标 8 秒）。
    2. 不要机械按字数切。优先保证语义完整，尤其是核心对话不要被切断。严禁大幅度删减原文，需确保分镜脚本基本覆盖原文的所有关键细节和对话。
    3. 第一段需有“勾子”，快速建立吸引力。
    4. 对每一段生成详细的画面描述、旁白、字幕、镜头建议、音频建议。
    5. **AI 视频提示词 (videoPrompt)**。遵循以下【实用提示词模板】强制输出：
       - 场景：哪里，时间，氛围。
       - 主体：谁，外观特征（需清晰可见）。
       - 动作：在做什么（必须是具体的）。
       - 镜头：推拉镜头/运镜。
       - 风格：4K/电影感/画质参数。
    6. **一键生成文案 (shortVideoScript)**。将旁白、画面核心、情绪关键词浓缩。
    7. **覆盖度要求**：确保分镜脚本拼凑出完整的原始文本。
    8. 预估时长：中文旁白约 4-6 字/秒。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sourceExcerpt: { type: Type.STRING },
              estimatedDuration: { type: Type.NUMBER },
              scene: { type: Type.STRING },
              characters: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotion: { type: Type.STRING },
              visual: { type: Type.STRING },
              voiceover: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              camera: { type: Type.STRING },
              audio: { type: Type.STRING },
              transition: { type: Type.STRING },
              videoPrompt: { type: Type.STRING },
              shortVideoScript: { type: Type.STRING }
            },
            required: ["sourceExcerpt", "estimatedDuration", "scene", "characters", "emotion", "visual", "voiceover", "subtitle", "camera", "audio", "transition", "videoPrompt", "shortVideoScript"]
          }
        }
      }
    });

    const segmentsRaw = JSON.parse(response.text || "[]") as any[];
    if (!Array.isArray(segmentsRaw)) {
      throw new Error("AI returned invalid data format: expected an array.");
    }
    
    return segmentsRaw.map((s, index) => ({
      ...s,
      id: index + 1,
      locked: false,
      edited: false
    }));
  } catch (error: any) {
    console.error("Gemini AI error detailed:", error);
    const message = error?.message || "Unknown AI error";
    throw new Error(`AI生成失败: ${message}`);
  }
}

