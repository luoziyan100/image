import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

interface UseFabricCanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  onPathCreated?: (path: fabric.Path) => void;
  onObjectAdded?: (object: fabric.FabricObject) => void;
}

export function useFabricCanvas(options: UseFabricCanvasOptions) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isInitializedRef = useRef(false);
  const onPathCreatedRef = useRef(options.onPathCreated);
  const onObjectAddedRef = useRef(options.onObjectAdded);

  // 更新回调函数引用
  useEffect(() => {
    onPathCreatedRef.current = options.onPathCreated;
    onObjectAddedRef.current = options.onObjectAdded;
  }, [options.onPathCreated, options.onObjectAdded]);

  // 初始化effect
  useEffect(() => {
    if (!canvasElementRef.current || isInitializedRef.current) {
      return;
    }

    console.log('🎨 useFabricCanvas: 开始初始化');

    let canvas: fabric.Canvas;

    try {
      canvas = new fabric.Canvas(canvasElementRef.current, {
        width: options.width,
        height: options.height,
        backgroundColor: options.backgroundColor || '#ffffff',
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        stateful: true,
        allowTouchScrolling: false,
        enableRetinaScaling: true,
        imageSmoothingEnabled: false
      });

      fabricCanvasRef.current = canvas;
      isInitializedRef.current = true;

      // 配置绘图模式
      canvas.isDrawingMode = true;
      canvas.selection = false;

      const brush = new fabric.PencilBrush(canvas);
      brush.color = '#000000';
      brush.width = 5;
      brush.limitedToCanvasSize = true;
      canvas.freeDrawingBrush = brush;

      // 事件处理
      const handlePathCreated = (e: any) => {
        console.log('useFabricCanvas: 路径创建', e.path);
        
        if (e && e.path) {
          // 确保路径属性正确设置，特别是颜色
          const currentBrush = canvas.freeDrawingBrush;
          e.path.set({
            selectable: false,
            evented: false,
            stroke: currentBrush?.color || '#000000',
            strokeWidth: currentBrush?.width || 5
          });
          
          console.log('路径颜色设置为:', currentBrush?.color);
          
          onPathCreatedRef.current?.(e.path);
        }
        
        // 强制渲染
        requestAnimationFrame(() => {
          canvas.renderAll();
        });
      };

      const handleObjectAdded = (e: any) => {
        console.log('useFabricCanvas: 对象添加', e.target);
        if (e && e.target) {
          onObjectAddedRef.current?.(e.target);
        }
        
        // 强制渲染
        requestAnimationFrame(() => {
          canvas.renderAll();
        });
      };

      // 绑定事件
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);

      console.log('✅ useFabricCanvas: 初始化完成');

      // 清理函数
      return () => {
        console.log('🧹 useFabricCanvas: 清理画布');
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.off('path:created', handlePathCreated);
          fabricCanvasRef.current.off('object:added', handleObjectAdded);
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
        isInitializedRef.current = false;
      };

    } catch (error) {
      console.error('❌ useFabricCanvas: 初始化失败', error);
      isInitializedRef.current = false;
    }
  }, [options.width, options.height, options.backgroundColor])

  // 更新画笔属性
  const updateBrush = useCallback((color: string, width: number, isEraser = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    console.log('useFabricCanvas: 更新画笔', { color, width, isEraser });

    canvas.isDrawingMode = true;
    canvas.selection = false;

    // 创建画笔
    const brush = new fabric.PencilBrush(canvas);
    
    if (isEraser) {
      // 橡皮擦模式：设置为背景色并启用特殊模式
      brush.color = options.backgroundColor || '#ffffff';
      brush.width = width;
      // 标记为橡皮擦模式（可用于后续的特殊处理）
      (brush as any).isEraser = true;
    } else {
      // 绘制模式：使用用户选择的颜色
      brush.color = color;
      brush.width = width;
      (brush as any).isEraser = false;
    }

    brush.limitedToCanvasSize = true;
    canvas.freeDrawingBrush = brush;
    
    console.log('画笔更新完成:', { 
      type: isEraser ? 'Eraser' : 'Pencil',
      color: brush.color, 
      width: brush.width 
    });
  }, [options.backgroundColor]);

  // 设置选择模式
  const setSelectMode = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
  }, []);

  // 清空画布
  const clearCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.clear();
    canvas.backgroundColor = options.backgroundColor || '#ffffff';
    canvas.renderAll();
  }, [options.backgroundColor]);

  // 获取画布JSON数据
  const getCanvasData = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return null;

    return canvas.toJSON();
  }, []);

  // 获取画布图片数据 (Base64) - 修复异步渲染问题
  const getCanvasImage = useCallback((format: string = 'png', quality: number = 0.8) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) {
      console.log('❌ getCanvasImage: Canvas未初始化或不存在');
      return null;
    }

    // 检查画布是否有内容
    const objects = canvas.getObjects();
    if (objects.length === 0) {
      console.log('❌ getCanvasImage: 画布为空，没有对象');
      return null;
    }

    console.log('🎨 getCanvasImage: 开始导出画布图像，对象数量:', objects.length);

    // 🔑 关键修复：强制同步渲染再导出
    canvas.renderAll();

    // 计算合适的缩放比例，确保图片不超过1024x1024
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const maxDimension = 1024;
    const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight, 1);

    console.log('📐 getCanvasImage: 画布尺寸:', { width: canvasWidth, height: canvasHeight, scale });

    const dataURL = canvas.toDataURL({
      format: format as 'png' | 'jpeg',
      quality: Math.min(quality, 0.8), // 限制质量避免过大文件
      multiplier: scale // 使用计算的缩放比例
    });

    if (dataURL && dataURL.length > 100) {
      console.log('✅ getCanvasImage: 成功导出，数据长度:', dataURL.length, '前50字符:', dataURL.substring(0, 50));
    } else {
      console.log('❌ getCanvasImage: 导出失败或数据异常:', dataURL);
    }

    return dataURL;
  }, []);

  // 检查画布是否有内容
  const hasCanvasContent = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) {
      console.log('❌ hasCanvasContent: Canvas未初始化');
      return false;
    }

    const objects = canvas.getObjects();
    const hasContent = objects.length > 0;
    console.log('🔍 hasCanvasContent: 对象数量:', objects.length, '有内容:', hasContent);
    return hasContent;
  }, []);

  // 加载画布数据
  const loadCanvasData = useCallback((data: string | object) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.loadFromJSON(data, () => {
      canvas.renderAll();
    });
  }, []);

  return {
    canvasElementRef,
    fabricCanvas: fabricCanvasRef.current,
    isInitialized: isInitializedRef.current,
    updateBrush,
    setSelectMode,
    clearCanvas,
    getCanvasData,
    getCanvasImage,
    hasCanvasContent,
    loadCanvasData
  };
}