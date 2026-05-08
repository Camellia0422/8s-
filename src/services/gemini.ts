/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { ScriptStyle, ScriptSegment } from "../types";
import { STYLE_PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateScript(text: string, style: ScriptStyle): Promise<ScriptSegment[]> {
  const stylePrompt = STYLE_PROMPTS[style];
    const prompt = `
    你是一个专业的短视频分镜脚本专家。请将以下中文小说片段转化为一系列 8 秒左右的短视频脚本。
    
    小说内容：
    """
    ${text}
    """
    
    风格要求：${stylePrompt}
    
    请遵循以下要求：
    1. 按语义和节奏对文本进行切分，每段预估时长在 6-10 秒之间（目标 8 秒）。
    2. 不要机械按字数切。优先保证语义完整，尤其是核心对话不要被切断。
    3. 第一段需有“勾子”，快速建立吸引力。
    4. 对每一段生成详细的画面描述、旁白、字幕、镜头建议、音频建议。
    5. **新增字段 1：AI 视频提示词 (videoPrompt)**。这是专门给 Sora/Kling/Luma 等 AI 视频生成工具使用的英文或中文关键词组，描述画面风格、构图、光影。
    6. **新增字段 2：一键生成文案 (shortVideoScript)**。将旁白、画面核心、情绪关键词浓缩成一段可以直接丢进“文字成片”工具的综合描述。
    7. 预估时长：中文旁白约 4-6 字/秒。
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
              sourceExcerpt: { type: Type.STRING, description: "该片段对应的原文摘录" },
              estimatedDuration: { type: Type.NUMBER, description: "预估时长（秒）" },
              scene: { type: Type.STRING, description: "场景描述" },
              characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "涉及角色列表" },
              emotion: { type: Type.STRING, description: "情绪基调" },
              visual: { type: Type.STRING, description: "画面描述" },
              voiceover: { type: Type.STRING, description: "旁白文案" },
              subtitle: { type: Type.STRING, description: "屏幕字幕" },
              camera: { type: Type.STRING, description: "镜头建议" },
              audio: { type: Type.STRING, description: "音效/BGM建议" },
              transition: { type: Type.STRING, description: "转场建议" },
              videoPrompt: { type: Type.STRING, description: "针对 AI 视频生成器的提示词建议" },
              shortVideoScript: { type: Type.STRING, description: "适合文字成片工具的综合文段" }
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
    // If it's an API error, it might have more details
    const message = error?.message || "Unknown AI error";
    throw new Error(`AI生成失败: ${message}`);
  }
}
