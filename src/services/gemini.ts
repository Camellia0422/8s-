/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { ScriptStyle, ScriptSegment } from "../types";

export async function generateScript(text: string, style: ScriptStyle): Promise<ScriptSegment[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const STYLE_PROMPTS = {
    "cinematic": "电影级工业化质感，注重光影对比（Chiaroscuro）、大光圈虚化（Bokeh）以及 2.39:1 宽画幅构图。强化主体细节，如皮肤纹理和动态模糊。",
    "animation": "高饱和度二次元或 3D 渲染风格。参考 Arcane 或 Pixar 质感，动作流畅且具有物理碰撞感，环境氛围具有插画感。",
    "vlog": "第一人称视角或自然跟拍，极具真实感。色彩柔和，自然采光。包含大量生活化动态细节，如风吹落叶、光斑闪烁。",
    "suspense": "希区柯克式心理悬疑。阴影强烈，低角度曝光。运镜包含大量慢推（Slow Push）和特写，营造压抑与不安的戏剧张力。"
  };
  
  const stylePrompt = STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS];
  const prompt = `
    你是一个顶级的 AI 视频导演和高级提示词工程师（Prompt Engineer）。请将以下中文小说片段转化为一系列 8 秒左右的短视频分镜脚本。
    
    小说内容：
    """
    ${text}
    """
    
    风格要求：${stylePrompt}
    
    请遵循以下【导演级 AI 视频调教协议】生成内容（适配 Kling/Runway/Pika/PixVerse/ComfyUI/Veo）：
    
    1. **电影级词库集成**：在 videoPrompt 中使用高级视觉术语（如：Anamorphic lens, volumetric lighting, Global Illumination, Ray Tracing, 8k resolution, Photorealistic texture）。
    2. **美式/工业化风格强化**：通过负面词规避实现高保真画质（规避：blurry, deformed, static, low quality）。
    3. **运镜精准调教**：明确规定运镜轨迹（如：Crane shot, Dolly zoom, Steadicam tracking, slow-motion at 120fps）。
    4. **人物与环境动态**：描述极细微的动态（如：subsurface scattering on skin, particulate matter dancing in light beams, hyper-detailed facial expressions）。
    5. **字段说明**：
       - **videoPrompt**：高级调优文档。格式为：[主体描述] + [动作细节] + [背景环境] + [运镜与光影参数]。
       - **shortVideoScript**：将旁白与核心视觉参数融合的万能文案模板。
    
    生成逻辑：
    - 每段时长目标 8s。
    - 确保完整覆盖原文所有对话和关键情节。
  `;

  try {
    console.log("Requesting gemini-3-flash-preview...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
              videoPrompt: { type: Type.STRING, description: "包含电影级调优参数的高级提示词" },
              shortVideoScript: { type: Type.STRING, description: "整合了万能模板的文案" }
            },
            required: ["sourceExcerpt", "estimatedDuration", "scene", "characters", "emotion", "visual", "voiceover", "subtitle", "camera", "audio", "transition", "videoPrompt", "shortVideoScript"]
          }
        }
      }
    });

    const resultText = response.text;
    const segmentsRaw = JSON.parse(resultText || "[]") as any[];
    
    return segmentsRaw.map((s, index) => ({
      ...s,
      id: index + 1,
      locked: false,
      edited: false
    }));
  } catch (error: any) {
    console.error("Gemini AI error:", error);
    throw new Error(`AI生成失败: ${error.message || "未知错误"}`);
  }
}

