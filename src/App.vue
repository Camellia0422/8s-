<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { 
  Plus, 
  Trash2, 
  Zap, 
  FileJson, 
  FileText, 
  Table, 
  ChevronRight, 
  Lock, 
  Unlock, 
  RotateCcw,
  Sun,
  Moon,
  Info,
  ChevronDown,
  Loader2,
  Copy,
  Check,
  Split,
  Merge,
  ArrowUp,
  ArrowDown
} from 'lucide-vue-next';
import { ScriptStyle, ScriptSegment, ProjectData } from './types';
import { EXAMPLE_TEXT, STYLE_PROMPTS } from './constants';
import { generateScript } from './services/gemini';

// State
const sourceText = ref("");
const style = ref<ScriptStyle>(ScriptStyle.NARRATIVE);
const segments = ref<ScriptSegment[]>([]);
const selectedId = ref<number | null>(null);
const isGenerating = ref(false);
const projectTitle = ref("未命名项目");
const darkMode = ref(false);
const copiedId = ref<number | null>(null);

// Computed
const selectedSegment = computed(() => segments.value.find(s => s.id === selectedId.value) || null);
const wordCount = computed(() => sourceText.value.length);
const totalDuration = computed(() => segments.value.reduce((acc, s) => acc + s.estimatedDuration, 0));

// Dark mode logic
watch(darkMode, (val) => {
  if (val) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}, { immediate: true });

// Handlers
const handleImportFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    sourceText.value = event.target?.result as string;
  };
  reader.readAsText(file);
};

const handleGenerate = async () => {
  if (!sourceText.value.trim() || isGenerating.value) return;
  
  isGenerating.value = true;
  try {
    const result = await generateScript(sourceText.value, style.value);
    segments.value = result;
    if (result.length > 0) selectedId.value = result[0].id;
  } catch (error: any) {
    console.error("生成出错:", error);
    alert(error.message || "生成失败，请检查网络或稍后重试。");
  } finally {
    isGenerating.value = false;
  }
};

const handleRegenerateSegment = async (id: number) => {
  const segment = segments.value.find(s => s.id === id);
  if (!segment || isGenerating.value) return;

  isGenerating.value = true;
  try {
    const result = await generateScript(segment.sourceExcerpt, style.value);
    if (result.length > 0) {
      const newSeg = { ...result[0], id, locked: segment.locked, edited: true };
      segments.value = segments.value.map(s => s.id === id ? newSeg : s);
    }
  } catch (error) {
    alert("重新生成片段失败");
  } finally {
    isGenerating.value = false;
  }
};

const moveSegment = (id: number, direction: "up" | "down") => {
  const index = segments.value.findIndex(s => s.id === id);
  if (index === -1) return;
  if (direction === "up" && index === 0) return;
  if (direction === "down" && index === segments.value.length - 1) return;

  const newSegments = [...segments.value];
  const offset = direction === "up" ? -1 : 1;
  [newSegments[index], newSegments[index + offset]] = [newSegments[index + offset], newSegments[index]];
  segments.value = newSegments;
};

const deleteSegment = (id: number) => {
  segments.value = segments.value.filter(s => s.id !== id);
  if (selectedId.value === id) selectedId.value = null;
};

const handleSplit = (id: number) => {
  const index = segments.value.findIndex(s => s.id === id);
  if (index === -1) return;
  const original = segments.value[index];
  const newSegment: ScriptSegment = { 
    ...original, 
    id: Date.now(), 
    sourceExcerpt: original.sourceExcerpt + " (拆分)",
    edited: true 
  };
  const nextSegments = [...segments.value];
  nextSegments.splice(index + 1, 0, newSegment);
  segments.value = nextSegments;
};

const handleMerge = (id: number) => {
  const index = segments.value.findIndex(s => s.id === id);
  if (index === -1 || index === segments.value.length - 1) return;
  const current = segments.value[index];
  const next = segments.value[index + 1];
  
  const merged: ScriptSegment = {
    ...current,
    sourceExcerpt: current.sourceExcerpt + "\n" + next.sourceExcerpt,
    voiceover: current.voiceover + " " + next.voiceover,
    estimatedDuration: current.estimatedDuration + next.estimatedDuration,
    videoPrompt: current.videoPrompt + ", " + next.videoPrompt,
    shortVideoScript: current.shortVideoScript + "\n" + next.shortVideoScript,
    edited: true
  };

  const nextSegments = [...segments.value];
  nextSegments.splice(index, 2, merged);
  segments.value = nextSegments;
  selectedId.value = merged.id;
};

const updateSegment = (id: number, updates: Partial<ScriptSegment>) => {
  segments.value = segments.value.map(s => s.id === id ? { ...s, ...updates, edited: true } : s);
};

const handleExport = (type: "json" | "csv" | "md") => {
  const project: ProjectData = {
    projectTitle: projectTitle.value,
    style: style.value,
    sourceText: sourceText.value,
    segments: segments.value
  };

  let content = "";
  let fileName = `script-${new Date().getTime()}`;

  if (type === "json") {
    content = JSON.stringify(project, null, 2);
    fileName += ".json";
  } else if (type === "csv") {
    const headers = ["ID", "原文", "时长", "场景", "角色", "情绪", "画面", "旁白", "字幕", "镜头", "音效", "转场", "AI视频提示词", "文字成片文案"];
    const rows = segments.value.map(s => [
      s.id, s.sourceExcerpt, s.estimatedDuration, s.scene, s.characters.join(","),
      s.emotion, s.visual, s.voiceover, s.subtitle, s.camera, s.audio, s.transition,
      s.videoPrompt, s.shortVideoScript
    ]);
    content = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    fileName += ".csv";
  } else if (type === "md") {
    content = `# ${project.projectTitle}\n\n## 风格: ${style.value}\n\n` + 
      segments.value.map(s => `### 片段 ${s.id} (${s.estimatedDuration}s)\n- **场景**: ${s.scene}\n- **画面**: ${s.visual}\n- **旁白**: ${s.voiceover}\n- **镜头**: ${s.camera}\n- **AI视频提示词**: ${s.videoPrompt}\n- **文字成片文案**: ${s.shortVideoScript}\n`).join("\n---\n\n");
    fileName += ".md";
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const handleCopySingle = (segment: ScriptSegment) => {
  const text = `片段 ${segment.id} | 时长: ${segment.estimatedDuration}s\n场景: ${segment.scene}\n画面: ${segment.visual}\n旁白: ${segment.voiceover}`;
  navigator.clipboard.writeText(text);
  copiedId.value = segment.id;
  setTimeout(() => copiedId.value = null, 2000);
};

const handleCopyGeneric = (text: string, id: number) => {
  navigator.clipboard.writeText(text);
  copiedId.value = id;
  setTimeout(() => copiedId.value = null, 2000);
};
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
    <!-- Header -->
    <header class="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 z-10 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="bg-indigo-600 p-1.5 rounded-lg">
          <Zap class="w-5 h-5 text-white" />
        </div>
        <input 
          v-model="projectTitle"
          class="font-bold text-lg tracking-tight bg-transparent border-none focus:ring-0 w-48"
        />
        <button 
          @click="() => {
            sourceText = '';
            segments = [];
            selectedId = null;
            projectTitle = '未命名项目';
          }"
          class="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
          title="新建项目"
        >
          <Plus class="w-4 h-4" /> 新建
        </button>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="darkMode = !darkMode"
          class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <Sun v-if="darkMode" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>
        
        <div class="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
        
        <div class="flex items-center gap-1">
          <button 
            @click="handleExport('md')"
            class="px-3 py-1.5 text-sm font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <FileText class="w-4 h-4" />
            Markdown
          </button>
          <button 
            @click="handleExport('csv')"
            class="px-3 py-1.5 text-sm font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Table class="w-4 h-4" />
            CSV
          </button>
          <button 
            @click="handleExport('json')"
            class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            <FileJson class="w-4 h-4" />
            JSON 导出
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      
      <!-- Left Column: Input -->
      <section class="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0 shadow-lg">
        <div class="p-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">原文输入</label>
            <span :class="['text-xs', wordCount > 5000 ? 'text-orange-500' : 'text-slate-400']">
              {{ wordCount }} 字
            </span>
          </div>
          <textarea 
            v-model="sourceText"
            placeholder="粘贴你的中文小说内容..."
            class="w-full h-80 p-3 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none font-serif leading-relaxed"
          ></textarea>
          <div class="flex gap-2 mt-3">
            <label class="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center">
              导入文件
              <input type="file" accept=".txt,.md" @change="handleImportFile" class="hidden" />
            </label>
            <button 
              @click="sourceText = EXAMPLE_TEXT"
              class="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              内置示例
            </button>
            <button 
              @click="() => {
                sourceText = '';
                segments = [];
                selectedId = null;
                projectTitle = '未命名项目';
              }"
              class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
              title="清空文字并重置项目"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="p-4 flex-1">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">脚本风格</label>
          <div class="space-y-2">
            <button
              v-for="s in (Object.keys(STYLE_PROMPTS) as ScriptStyle[])"
              :key="s"
              @click="style = s"
              :class="[
                'w-full p-3 rounded-lg text-left text-sm transition-all border-2',
                style === s 
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' 
                : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              ]"
            >
              <div class="capitalize mb-1">{{s === 'narrative' ? '叙事版' : s === 'exciting' ? '爽感版' : '悬疑版'}}</div>
              <p class="text-[10px] opacity-70 line-clamp-2 leading-tight">
                {{ STYLE_PROMPTS[s] }}
              </p>
            </button>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            @click="handleGenerate"
            :disabled="!sourceText || isGenerating"
            :class="[
              'w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition-all',
              !sourceText || isGenerating 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95'
            ]"
          >
            <Loader2 v-if="isGenerating" class="w-5 h-5 animate-spin" />
            <Zap v-else class="w-5 h-5" />
            {{ isGenerating ? "正在重组语义..." : "生成脚本" }}
          </button>
        </div>
      </section>

      <!-- Middle Column: Segments List -->
      <section class="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 min-w-0">
        <div class="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold">片段列表</span>
            <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 uppercase">
              {{ segments.length }} 个 8s 片段
            </span>
          </div>
          <button v-if="segments.length > 0" class="text-xs text-indigo-600 hover:underline font-medium">重置排序</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
          <div v-if="isGenerating" class="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center space-y-4">
            <div class="relative">
              <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
              <Zap class="w-5 h-5 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div class="text-center">
              <p class="text-sm font-bold text-slate-900 dark:text-white mb-1">正在进行语义切分...</p>
              <p class="text-xs text-slate-500">正在按 8s 时长和叙事节奏重构分镜</p>
            </div>
          </div>

          <div v-if="segments.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 px-10 text-center">
            <div v-if="sourceText" class="space-y-6 flex flex-col items-center">
              <div class="p-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full shadow-inner relative">
                <Zap class="w-16 h-16 text-indigo-600 animate-pulse" />
                <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
              </div>
              <div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">文本已就绪！</h3>
                <p class="text-sm text-slate-500 max-w-sm mb-6">
                  点击下方按钮，AI 将根据你选择的 <span class="text-indigo-600 font-bold">{{style === 'narrative' ? '叙事' : style === 'exciting' ? '爽感' : '悬疑'}}</span> 风格，将小说拆解为最适合短视频节奏的分镜。
                </p>
                <button 
                  @click="handleGenerate"
                  class="group relative px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden"
                >
                  <div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Zap class="w-6 h-6 fill-current" />
                  立即生成分镜脚本
                  <ChevronRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <template v-else>
              <div class="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                <FileText class="w-12 h-12 text-slate-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">欢迎来到短视频分镜工坊</h3>
                <p class="text-sm text-slate-500 max-w-xs mx-auto">
                  请在左侧输入你的小说原文，我们将为你自动生成 8 秒一段的镜头脚本。
                </p>
              </div>
            </template>
          </div>

          <template v-else>
            <div
              v-for="(s, index) in segments"
              :key="s.id"
              @click="selectedId = s.id"
              :class="[
                'group relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                selectedId === s.id 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-sm' 
                : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900 shadow-sm'
              ]"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span :class="[
                    'flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold',
                    selectedId === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  ]">
                    {{ index + 1 }}
                  </span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ s.estimatedDuration }} 秒
                  </span>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    @click.stop="moveSegment(s.id, 'up')"
                    class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                    title="上移"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>
                  <button 
                    @click.stop="moveSegment(s.id, 'down')"
                    class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" 
                    title="下移"
                  >
                    <ArrowDown class="w-3.5 h-3.5" />
                  </button>
                  <button 
                    @click.stop="handleCopySingle(s)"
                    class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <Check v-if="copiedId === s.id" class="w-3.5 h-3.5 text-green-500" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3 italic">
                "{{ s.sourceExcerpt }}"
              </p>
              
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span class="text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded transition-colors">
                  {{ s.scene }}
                </span>
                <span class="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded transition-colors">
                  {{ s.emotion }}
                </span>
              </div>

              <div v-if="s.locked" class="absolute top-2 right-2 p-1 bg-slate-100 dark:bg-slate-800 rounded">
                <Lock class="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </template>
        </div>
        
        <div v-if="segments.length > 0" class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div class="flex gap-2">
            <button 
              @click="handleSplit(selectedId!)"
              :disabled="!selectedId"
              class="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
            >
              <Split class="w-3.5 h-3.5" /> 拆分片段
            </button>
            <button 
              @click="handleMerge(selectedId!)"
              :disabled="!selectedId || segments.findIndex(s => s.id === selectedId) === segments.length - 1"
              class="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
            >
              <Merge class="w-3.5 h-3.5" /> 合并前后
            </button>
          </div>
        </div>
      </section>

      <!-- Right Column: Detail Editor -->
      <section class="w-[450px] bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-2xl z-10">
        <div class="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4">
          <span class="text-sm font-bold flex items-center gap-2">
            <FileJson class="w-4 h-4 text-indigo-500" /> 脚本详情
          </span>
          <div v-if="selectedSegment" class="flex items-center gap-2">
            <button 
              @click="updateSegment(selectedSegment.id, { locked: !selectedSegment.locked })"
              :class="['p-2 rounded-md', selectedSegment.locked ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']"
            >
              <Lock v-if="selectedSegment.locked" class="w-4 h-4" />
              <Unlock v-else class="w-4 h-4" />
            </button>
            <button 
              @click="handleRegenerateSegment(selectedSegment.id)"
              :disabled="isGenerating"
              class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors disabled:opacity-50"
              title="重新生成该段"
            >
              <RotateCcw :class="['w-4 h-4', isGenerating ? 'animate-spin' : '']" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div v-if="!selectedSegment" class="h-full flex items-center justify-center text-slate-300">
            <p class="text-sm">点击左侧列表查看或编辑详细脚本</p>
          </div>
          <div v-else class="space-y-5 pb-10 transition-all">
            <!-- Source Excerpt - Editable for replacement and regeneration -->
            <div class="space-y-2 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
              <div class="flex items-center justify-between mb-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <FileText class="w-3 h-3" /> 原文摘录 (修改后可重新生成)
                </label>
              </div>
              <textarea 
                v-model="selectedSegment.sourceExcerpt"
                @input="updateSegment(selectedSegment.id, { sourceExcerpt: ($e.target as HTMLTextAreaElement).value })"
                placeholder="在此替换原文内容..."
                class="w-full h-24 p-3 text-sm bg-white dark:bg-slate-900 border-2 border-transparent focus:border-amber-500 rounded-xl resize-none transition-all font-serif"
              ></textarea>
              <div class="mt-2 flex justify-end">
                <button 
                  @click="handleRegenerateSegment(selectedSegment.id)"
                  :disabled="isGenerating"
                  class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-full flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  <RotateCcw :class="['w-3 h-3', isGenerating ? 'animate-spin' : '']" />
                  基于新原文重新生成
                </button>
              </div>
            </div>

            <!-- Visual Description -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">画面描述</label>
              <textarea 
                v-model="selectedSegment.visual"
                @input="updateSegment(selectedSegment.id, { visual: ($e.target as HTMLTextAreaElement).value })"
                class="w-full h-24 p-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl resize-none transition-all"
              ></textarea>
            </div>

            <!-- Voiceover & Subtitle -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">旁白文案</label>
                <textarea 
                  v-model="selectedSegment.voiceover"
                  @input="updateSegment(selectedSegment.id, { voiceover: ($e.target as HTMLTextAreaElement).value })"
                  class="w-full h-20 p-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl resize-none transition-all"
                ></textarea>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">屏幕字幕</label>
                <textarea 
                  v-model="selectedSegment.subtitle"
                  @input="updateSegment(selectedSegment.id, { subtitle: ($e.target as HTMLTextAreaElement).value })"
                  class="w-full h-20 p-3 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl resize-none transition-all"
                ></textarea>
              </div>
            </div>

            <!-- Camera & Audio -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">镜头建议</label>
                <input 
                  type="text"
                  v-model="selectedSegment.camera"
                  @input="updateSegment(selectedSegment.id, { camera: ($e.target as HTMLInputElement).value })"
                  class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-lg transition-all"
                />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">音效/BGM</label>
                <input 
                  type="text"
                  v-model="selectedSegment.audio"
                  @input="updateSegment(selectedSegment.id, { audio: ($e.target as HTMLInputElement).value })"
                  class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-lg transition-all"
                />
              </div>
            </div>

            <!-- Additional Info -->
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase">时长</label>
                <div class="text-sm font-bold">{{ selectedSegment.estimatedDuration }}s</div>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase">情绪</label>
                <input 
                  v-model="selectedSegment.emotion"
                  @input="updateSegment(selectedSegment.id, { emotion: ($e.target as HTMLInputElement).value })"
                  class="text-xs bg-transparent border-none p-0 focus:ring-0 w-full font-bold"
                />
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase">转场</label>
                <input 
                  v-model="selectedSegment.transition"
                  @input="updateSegment(selectedSegment.id, { transition: ($e.target as HTMLInputElement).value })"
                  class="text-xs bg-transparent border-none p-0 focus:ring-0 w-full font-bold"
                />
              </div>
            </div>

            <!-- New Fields: Video Prompt & Short Video Script -->
            <div class="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">AI 视频提示词 (关键词生成)</label>
                  <button 
                    @click="handleCopyGeneric(selectedSegment.videoPrompt, selectedSegment.id)"
                    class="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
                  >
                    <Check v-if="copiedId === selectedSegment.id" class="w-3.5 h-3.5 text-green-500" />
                    <Copy v-else class="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
                <textarea 
                  v-model="selectedSegment.videoPrompt"
                  @input="updateSegment(selectedSegment.id, { videoPrompt: ($e.target as HTMLTextAreaElement).value })"
                  placeholder="用于 Sora/Kling 的画面关键词..."
                  class="w-full h-20 p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl resize-none transition-all"
                ></textarea>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">文字成片文案 (一键式文段)</label>
                  <button 
                    @click="handleCopyGeneric(selectedSegment.shortVideoScript, 999999)"
                    class="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
                  >
                    <Check v-if="copiedId === 999999" class="w-3.5 h-3.5 text-green-500" />
                    <Copy v-else class="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
                <textarea 
                  v-model="selectedSegment.shortVideoScript"
                  @input="updateSegment(selectedSegment.id, { shortVideoScript: ($e.target as HTMLTextAreaElement).value })"
                  placeholder="适合直接导入生成视频的文段..."
                  class="w-full h-24 p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl resize-none transition-all"
                ></textarea>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">角色</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="(char, i) in selectedSegment.characters" :key="i" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                  {{ char }}
                </span>
                <button class="w-6 h-6 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 rounded-md text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all">
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
              <div class="flex items-center gap-2 mb-2">
                <Info class="w-3.5 h-3.5 text-indigo-500" />
                <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">创作建议</span>
              </div>
              <p class="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300 opacity-80">
                该片段旁白约为 {{ selectedSegment.voiceover.length }} 字。建议语速保持适中，配合 {{ selectedSegment.camera }} 增强氛围感。
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="selectedSegment" class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
          <button 
            @click="handleCopySingle(selectedSegment)"
            :class="[
              'flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95',
              copiedId === selectedSegment.id 
              ? 'bg-green-600 text-white shadow-green-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
            ]"
          >
            <Check v-if="copiedId === selectedSegment.id" class="w-4 h-4" />
            <Copy v-else class="w-4 h-4" />
            {{ copiedId === selectedSegment.id ? "已复制到剪贴板" : "复制本段脚本" }}
          </button>
        </div>
      </section>

    </main>

    <!-- Footer / Status Bar -->
    <footer class="h-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-6 text-[10px] font-medium text-slate-500">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <div :class="['w-2 h-2 rounded-full', isGenerating ? 'bg-orange-500 animate-pulse' : 'bg-green-500']" />
          <span>系统就绪</span>
        </div>
        <span>|</span>
        <span>总片段: {{ segments.length }}</span>
        <span>|</span>
        <span>预计视频时长: {{ totalDuration }}s</span>
      </div>
      <div class="flex items-center gap-3">
        <span>AI Engine: Gemini 3 Flash</span>
        <span class="flex items-center gap-1">
          <Check class="w-3 h-3 text-green-500" /> 自动保存已开启
        </span>
      </div>
    </footer>
    
    <!-- Global Styles -->
    <component is="style">
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
      }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1e293b;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
      }
    </component>
  </div>
</template>

<style>
/* Any additional global scoped styles if needed */
</style>
