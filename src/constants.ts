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
  [ScriptStyle.NARRATIVE]: "偏沉浸、自然、文学感。画面描述要细腻，带有叙事张力。",
  [ScriptStyle.EXCITING]: "节奏快、钩子强、强调冲突和反差。画面要冲击力强，文案干脆利落。",
  [ScriptStyle.SUSPENSE]: "强化压迫感、未知感、异变预兆。画面色调偏暗，暗示不寻常的细节。"
};

export const CHINESE_PUNCTUATION = /[。！？…“”]/;
