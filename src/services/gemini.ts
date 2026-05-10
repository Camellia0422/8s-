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
    2. 不要机械按字数切。优先保证语义完整，尤其是核心对话不要被切断。严禁大幅度删减原文，需确保分镜脚本基本覆盖原文的所有关键细节和对话。
    3. 第一段需有“勾子”，快速建立吸引力。
    4. 对每一段生成详细的画面描述、旁白、字幕、镜头建议、音频建议。
    5. **新增字段 1：AI 视频提示词 (videoPrompt)**。这是专门给 Sora/Kling/Luma 等工具使用的，必须严格遵循以下【实用提示词模板】和【约束条件】强制输出：
       【实用提示词模板】：
       - 场景：在哪里，什么时间，什么氛围。
       - 主体：谁，外观特征是什么（性别、年龄、种族、服装、发型需清晰可见）。
       - 动作：在做什么，动作幅度多大（必须是具体的走、跑、转头、凝视等，严禁模糊描述）。
       - 镜头：推进、拉远、跟拍、环绕、平摇等专业机位或运镜描述。
       - 风格：指定写实、动画、电影感、国风等，并包含 4K、电影级画质等参数。
       【约束条件】：
       输出中需直接体现或隐含“不要水印、不要多余人物、不要抖动、不要切镜混乱、人物表情自然”的要求。建议结构：[主体] + [动作] + [场景] + [镜头语言] + [光影/氛围] + [风格/画质参数]。
    6. **新增字段 2：一键生成文案 (shortVideoScript)**。将旁白、画面核心、情绪关键词浓缩成一段可以直接丢进“文字成片”工具的综合描述。
    7. **覆盖度要求**：所有生成的片段及其对应的“原文摘录” (sourceExcerpt) 应连贯地拼凑出完整的原始文本，不得随意跳过或简化重要情节。
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
