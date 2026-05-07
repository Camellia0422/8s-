/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ScriptStyle {
  NARRATIVE = "narrative", // 叙事版
  EXCITING = "exciting",   // 爽感版
  SUSPENSE = "suspense"    // 悬疑版
}

export interface ScriptSegment {
  id: number;
  sourceExcerpt: string;
  estimatedDuration: number;
  scene: string;
  characters: string[];
  emotion: string;
  visual: string;
  voiceover: string;
  subtitle: string;
  camera: string;
  audio: string;
  transition: string;
  locked?: boolean;
  edited?: boolean;
}

export interface ProjectData {
  projectTitle: string;
  style: ScriptStyle;
  sourceText: string;
  segments: ScriptSegment[];
}
