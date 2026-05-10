/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScriptStyle } from "./types";

export const EXAMPLE_TEXT = `九月的夏末还没褪去燥热。
老旧的教室里，风扇吱呀吱呀地转着，却带不走凝固的空气。
陈屿趴在课桌上，汗水浸湿了蓝白相间的校服后背。他微微抬头，看见林浩正对着窗户发呆。
“林浩，你说咱们这辈子就这样了吗？”陈屿的声音闷闷的。
林浩没回头，窗外的蝉鸣震耳欲聋。
他只是指了指天边那团火烧云，轻声说：“看，那是风去的方向。”
陈屿愣住了，那一刻，他仿佛听到了锁链断裂的声音。`;

export const STYLE_PROMPTS: Record<ScriptStyle, string> = {
  [ScriptStyle.NARRATIVE]: "电影级工业化质感，注重光影对比（Chiaroscuro）与大场景叙事张力。适配 Kling/Runway 电影模式。",
  [ScriptStyle.EXCITING]: "高强度视觉冲击与美式风格强化。注重动作自然化与快节奏剪辑感。适配 Pika/PixVerse 动态驱动。",
  [ScriptStyle.SUSPENSE]: "希区柯克式心理悬疑。强化环境动态、冷色调与未知感预兆。适配 SVD/ComfyUI 深度定制。"
};

export const CHINESE_PUNCTUATION = /[。！？…“”]/;
