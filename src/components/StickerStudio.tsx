'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { aiService, transformImage, type GenerationResult } from '@/lib/ai';
import { Button } from './ui/Button';
import { cn } from '@/utils/cn';

interface StickerStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  preview?: string;
}

const STICKER_STYLES: StickerStyle[] = [
  {
    id: 'pop-art',
    name: '🎨 波普艺术',
    description: '粗黑轮廓、本戴点、拟声词的复古漫画风格',
    prompt:
      "Create a single sticker in the distinct Pop Art style. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. The image should feature bold, thick black outlines around all figures, objects, and text. Utilize a limited, flat color palette consisting of vibrant primary and secondary colors, applied in unshaded blocks, but maintain the person skin tone. Incorporate visible Ben-Day dots or halftone patterns to create shading, texture, and depth. The subject should display a dramatic expression. Include stylized text within speech bubbles or dynamic graphic shapes to represent sound effects (onomatopoeia). The overall aesthetic should be clean, graphic, and evoke a mass-produced, commercial art sensibility with a polished finish. The user's face from the uploaded photo must be the main character, ideally with an interesting outline shape that is not square or circular but closer to a dye-cut pattern." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-pop_art_love.png'
  },
  {
    id: 'matchbox',
    name: '🏮 昭和火柴盒',
    description: '日本昭和时代火柴盒平面设计，复古印刷质感',
    prompt:
      "Make a single sticker in Japanese Showa-era matchbox art. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. Make a sticker in Japanese Showa-era matchbox art, retro graphic design, limited color palette, distressed paper texture and a retro-futuristic rocket ship, design for a 1960s Japanese matchbox label. Showa kitsch illustration, simple lines, 2-color print style, ideally with an interesting outline shape that is not square or circular but closer to a dye-cut pattern." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-matchbox.png'
  },
  {
    id: 'pixel',
    name: '👾 像素艺术',
    description: '复古 8-bit 像素、炫彩 glitch 元素',
    prompt:
      "Create a single sticker in the style of a retro Pixel Art piece. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. The pixel art should be colorful, abstract, slightly retro-futuristic, combining 8 bit and glitch elements, and incorporating additional icons or accessories that represent the intended emotion, ideally with an interesting outline shape that is not square or circular but closer to a dye-cut pattern." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-pixel.png'
  },
  {
    id: 'royal',
    name: '👑 王室童话',
    description: '卡通皇室成员 + 独角兽和彩虹',
    prompt:
      "Create a single sticker transforming the pic into royalty - a king, queen, prince or princess - with unicorns and rainbows. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. The image should feature a cool looking king, queen, prince or cute princess along with augmenting aces, spades, diamonds, hearts, unicorns, rainbows and clouds, ideally with an interesting outline shape that is not square or circular but closer to a die-cut pattern. The user's face should always be in a cartoonish style like the surrounding stickers, and never show in a photorealistic style." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-royal.png'
  },
  {
    id: 'football',
    name: '⚽ 复古足球',
    description: '70年代球员交换卡、做旧质感',
    prompt:
      "Generate a single sticker in the style of vintage 1970s soccer trading cards. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. The sticker should feature a headshot or upper torso portrait of a football player or manager. Optionally, include a small, stylized team crest or a retro club name banner at the top. The entire sticker should have a clean, defined border and a slightly aged or matte finish to evoke a nostalgic, collectible feel." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-football.png'
  },
  {
    id: 'clay',
    name: '🏺 黏土动画',
    description: '拟物黏土质感、夸张表情与景观',
    prompt:
      "Create a single sticker in the style of a classic claymation character. The character should be customized based on the attached profile picture. The character must express the emotion: '[Specify Emotion]'. The sticker should feature a claymation character where the picture is made to look like it is made from clay, and an interesting claymation landscape in the background, using the playfulness of claymation to exaggerate certain features depending on the emotion, and with clay-like sculpting of the face visible when expressing different emotions, ideally with an interesting outline shape that is not square or circular but closer to a dye-cut pattern." ,
    preview: 'https://baoyu.io/uploads/2025-09-17-claymation.png'
  }
];

const EMOTIONS = [
  { zh: '开心', en: 'Happy' },
  { zh: '伤心', en: 'Sad' },
  { zh: '生气', en: 'Angry' },
  { zh: '惊讶', en: 'Surprised' },
  { zh: '大笑', en: 'Laughing' },
  { zh: '爱心', en: 'Love' },
  { zh: '眨眼', en: 'Winking' },
  { zh: '困惑', en: 'Confused' }
];

function buildPrompt(template: string, emotion: string) {
  if (!template) return '';
  let prompt = template;
  const replacements = [
    /\[指定情绪\]/gi,
    /\[指定情緒\]/gi,
    /\[Specify Emotion\]/gi,
    /\'\$\{emotion\}\'/g,
    /\$\{emotion\}/g
  ];
  replacements.forEach((pattern) => {
    prompt = prompt.replace(pattern, emotion);
  });
  return prompt;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const StickerStudio: React.FC = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(STICKER_STYLES[0]?.id || '');
  const [selectedEmotion, setSelectedEmotion] = useState<string>(EMOTIONS[0]?.en || 'Happy');
  const [customEmotion, setCustomEmotion] = useState('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await aiService.getAvailableProviders();
        setAvailableProviders(providers);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
        }
      } catch (err) {
        console.error('Failed to load providers', err);
      }
    };
    loadProviders();
  }, []);

  const currentStyle = useMemo(
    () => STICKER_STYLES.find((style) => style.id === selectedStyleId) || STICKER_STYLES[0],
    [selectedStyleId]
  );

  const emotionLabel = customEmotion.trim() || selectedEmotion;
  const promptPreview = useMemo(() => buildPrompt(currentStyle?.prompt || '', emotionLabel), [currentStyle, emotionLabel]);

  const handleAvatarChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setAvatar(base64);
      setResult(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('读取图片失败，请重试');
    }
  };

  const handleGenerate = async () => {
    if (!avatar) {
      setError('请先上传人物头像');
      return;
    }
    if (!selectedProvider) {
      setError('请先配置并选择 AI 提供商');
      return;
    }
    if (!currentStyle) {
      setError('请选择一个贴纸风格');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);

      const generation = await transformImage(avatar, promptPreview, {
        provider: selectedProvider,
        quality: 'standard'
      });

      if (generation.status === 'completed') {
        setResult(generation);
      } else {
        setError(generation.error?.message || '生成失败，请稍后再试');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result?.result) return;
    const url = result.result.url || result.result.base64;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `sticker-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sticker-studio bg-gray-50 min-h-[calc(100vh-56px)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">头像贴纸工作室</h2>
          <p className="text-sm text-gray-600 mt-1">
            上传人物头像，选择喜欢的风格与情绪，一键生成炫酷贴纸。
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：上传与预览 */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. 上传人物头像</h3>
              <div
                className={cn(
                  'rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-colors',
                  avatar ? 'border-blue-300 bg-blue-50/40' : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="sticker-avatar-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarChange(file);
                  }}
                />
                {avatar ? (
                  <>
                    <img
                      src={avatar}
                      alt="已上传头像"
                      className="w-48 h-48 object-cover rounded-full shadow mb-4"
                    />
                    <div className="flex items-center gap-2">
                      <label htmlFor="sticker-avatar-input" className="text-sm text-blue-600 cursor-pointer hover:underline">
                        更换图片
                      </label>
                      <button
                        onClick={() => {
                          setAvatar(null);
                          setResult(null);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        移除
                      </button>
                    </div>
                  </>
                ) : (
                  <label htmlFor="sticker-avatar-input" className="cursor-pointer">
                    <div className="text-5xl mb-3">📤</div>
                    <p className="text-sm text-gray-600">点击或拖拽上传头像（建议正面、清晰）</p>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                小贴士：背景越简单、人物越居中，贴纸效果越好。建议使用正面半身照。
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 贴纸预览</h3>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 text-blue-600 space-y-3">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full" />
                  <p className="text-sm">贴纸生成中，请稍候...</p>
                </div>
              ) : result?.result ? (
                <div className="flex flex-col items-center">
                  <img
                    src={result.result.url || result.result.base64 || ''}
                    alt="生成的贴纸"
                    className="w-56 h-56 object-contain bg-white rounded-xl shadow mb-4"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDownload}>
                      下载贴纸
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResult(null)}
                    >
                      重新生成
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg py-10 flex items-center justify-center">
                  尚未生成贴纸
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* 右侧：风格 & 提示词 */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">3. 选择贴纸风格</h3>
                {availableProviders.length > 0 ? (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {availableProviders.map((p) => (
                      <option key={p} value={p}>
                        {p === 'gemini-tuzi' ? 'Gemini 2.5 Flash' : p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
                    尚未配置可用 AI 提供商
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STICKER_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyleId(style.id)}
                    className={cn(
                      'text-left border rounded-lg p-3 transition-all h-full flex flex-col gap-2',
                      selectedStyleId === style.id
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-gray-900">{style.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 flex-1">{style.description}</p>
                    {style.preview && (
                      <img src={style.preview} alt={style.name} className="w-full h-32 object-cover rounded" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">4. 设置情绪</h3>
              <p className="text-sm text-gray-600">选择角色的情绪，或自定义情绪词汇。</p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion.en}
                    type="button"
                    onClick={() => {
                      setSelectedEmotion(emotion.en);
                      setCustomEmotion('');
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full border text-sm transition-colors',
                      selectedEmotion === emotion.en && !customEmotion
                        ? 'border-blue-400 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                    )}
                  >
                    {emotion.zh} / {emotion.en}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="自定义情绪（例如 Cheerful、Playful）"
                  value={customEmotion}
                  onChange={(e) => setCustomEmotion(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">5. 提示词预览</h3>
              <textarea
                readOnly
                value={promptPreview}
                className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                模板会自动引用上传的头像，无需额外描述。你可以复制并调整提示词，用于其他模型或后台流程。
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !avatar || !selectedProvider}
                className="w-full"
              >
                {isGenerating ? '生成中...' : '生成贴纸'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

