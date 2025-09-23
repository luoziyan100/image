import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

type FabricObject = fabric.FabricObject;
type FabricCanvas = fabric.Canvas;
type FabricImage = fabric.FabricImage;

type LayerInfo = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
};

type LayeredImage = FabricImage & {
  layerId?: string;
  layerName?: string;
};

type BrushWithEraser = fabric.PencilBrush & { isEraser?: boolean };

interface PathCreatedEvent {
  path?: FabricObject | null;
}

interface ObjectAddedEvent {
  target?: FabricObject | null;
}

const isLayeredImage = (object: FabricObject): object is LayeredImage => object instanceof fabric.FabricImage;

interface CanvasWithLayerControls extends FabricCanvas {
  bringForward(object: FabricObject): FabricCanvas;
  sendBackwards(object: FabricObject): FabricCanvas;
  bringToFront(object: FabricObject): FabricCanvas;
  sendToBack(object: FabricObject): FabricCanvas;
}

interface UseFabricCanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  onPathCreated?: (path: fabric.Path) => void;
  onObjectAdded?: (object: fabric.Object) => void;
}

export function useFabricCanvas(options: UseFabricCanvasOptions) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const isInitializedRef = useRef(false);
  const onPathCreatedRef = useRef(options.onPathCreated);
  const onObjectAddedRef = useRef(options.onObjectAdded);

  useEffect(() => {
    onPathCreatedRef.current = options.onPathCreated;
    onObjectAddedRef.current = options.onObjectAdded;
  }, [options.onPathCreated, options.onObjectAdded]);

  useEffect(() => {
    if (!canvasElementRef.current || isInitializedRef.current) {
      return;
    }

    let canvas: FabricCanvas;

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
        imageSmoothingEnabled: false,
      });

      fabricCanvasRef.current = canvas;
      isInitializedRef.current = true;

      canvas.isDrawingMode = true;
      canvas.selection = false;

      const brush = new fabric.PencilBrush(canvas) as BrushWithEraser;
      brush.color = '#000000';
      brush.width = 5;
      brush.limitedToCanvasSize = true;
      canvas.freeDrawingBrush = brush;

      const handlePathCreated = (event: unknown) => {
        const { path } = (event as PathCreatedEvent) || {};
        if (path) {
          const currentBrush = canvas.freeDrawingBrush as BrushWithEraser | undefined;
          path.set({
            selectable: false,
            evented: false,
            stroke: currentBrush?.color || '#000000',
            strokeWidth: currentBrush?.width || 5,
          });
          onPathCreatedRef.current?.(path as fabric.Path);
        }

        requestAnimationFrame(() => {
          canvas.renderAll();
        });
      };

      const handleObjectAdded = (event: unknown) => {
        const { target } = (event as ObjectAddedEvent) || {};
        if (target) {
          onObjectAddedRef.current?.(target as FabricObject);
        }
        requestAnimationFrame(() => {
          canvas.renderAll();
        });
      };

      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);

      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.off('path:created', handlePathCreated);
          fabricCanvasRef.current.off('object:added', handleObjectAdded);
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
        isInitializedRef.current = false;
      };
    } catch (error) {
      console.error('useFabricCanvas: 初始化失败', error);
      isInitializedRef.current = false;
    }
  }, [options.backgroundColor, options.height, options.width]);

  const updateBrush = useCallback(
    (color: string, width: number, isEraser = false) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isInitializedRef.current) return;

      canvas.isDrawingMode = true;
      canvas.selection = false;

      const brush = new fabric.PencilBrush(canvas) as BrushWithEraser;

      if (isEraser) {
        brush.color = options.backgroundColor || '#ffffff';
        brush.width = width;
        brush.isEraser = true;
      } else {
        brush.color = color;
        brush.width = width;
        brush.isEraser = false;
      }

      brush.limitedToCanvasSize = true;
      canvas.freeDrawingBrush = brush;
    },
    [options.backgroundColor]
  );

  const setSelectMode = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.clear();
    const defaultBg = options.backgroundColor || '#ffffff';
    canvas.backgroundColor = defaultBg;
    canvas.renderAll();
  }, [options.backgroundColor]);

  const getCanvasData = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return null;

    return canvas.toJSON();
  }, []);

  const getCanvasImage = useCallback(
    (format: 'png' | 'jpeg' = 'png', quality: number = 0.8) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isInitializedRef.current) {
        return null;
      }

      const objects = canvas.getObjects();
      if (objects.length === 0) {
        return null;
      }

      canvas.renderAll();

      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const maxDimension = 1024;
      const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight, 1);

      const dataURL = canvas.toDataURL({
        format,
        quality: Math.min(quality, 0.8),
        multiplier: scale,
      });

      return dataURL;
    },
    []
  );

  const hasCanvasContent = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) {
      return false;
    }

    const objects = canvas.getObjects();
    return objects.length > 0;
  }, []);

  const exportPoseImage = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return null;

    const originalBg = canvas.backgroundColor;
    const objects = canvas.getObjects();
    const imageObjects: LayeredImage[] = [];
    objects.forEach((object) => {
      if (isLayeredImage(object)) {
        imageObjects.push(object);
      }
    });

    imageObjects.forEach((img) => img.set('visible', false));
    canvas.backgroundColor = 'rgba(0,0,0,0)';
    canvas.renderAll();

    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });

    imageObjects.forEach((img) => img.set('visible', true));
    const restoredBg = typeof originalBg === 'string' ? originalBg : '#ffffff';
    canvas.backgroundColor = restoredBg;
    canvas.renderAll();

    return dataURL;
  }, []);

  const exportMaskImage = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return null;

    const originalBg = canvas.backgroundColor;
    const objects = canvas.getObjects();
    const imageObjects: LayeredImage[] = [];
    const nonImageObjects: FabricObject[] = [];
    const backupStyles = new Map<FabricObject, {
      stroke?: FabricObject['stroke'];
      fill?: FabricObject['fill'];
      opacity?: FabricObject['opacity'];
    }>();

    objects.forEach((object) => {
      if (isLayeredImage(object)) {
        imageObjects.push(object);
      } else {
        nonImageObjects.push(object);
      }
    });

    imageObjects.forEach((img) => img.set('visible', false));
    nonImageObjects.forEach((object) => {
      backupStyles.set(object, {
        stroke: object.stroke,
        fill: object.fill,
        opacity: object.opacity,
      });
      object.set('stroke', '#ffffff');
      if ('fill' in object) {
        object.set('fill', '#ffffff');
      }
      object.set('opacity', 1);
    });
    canvas.backgroundColor = '#000000';
    canvas.renderAll();

    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });

    nonImageObjects.forEach((object) => {
      const backup = backupStyles.get(object);
      if (backup) {
        if (typeof backup.stroke !== 'undefined') {
          object.set('stroke', backup.stroke ?? undefined);
        }
        if (typeof backup.fill !== 'undefined') {
          object.set('fill', backup.fill ?? undefined);
        }
        if (typeof backup.opacity !== 'undefined') {
          object.set('opacity', backup.opacity ?? 1);
        }
      }
    });
    imageObjects.forEach((img) => img.set('visible', true));
    const restoredBg = typeof originalBg === 'string' ? originalBg : '#ffffff';
    canvas.backgroundColor = restoredBg;
    canvas.renderAll();

    return dataURL;
  }, []);

  const listImageLayers = useCallback((): LayerInfo[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return [];

    const objects = canvas.getObjects();
    return objects
      .map((obj, index) => ({ obj, index }))
      .filter(({ obj }) => isLayeredImage(obj))
      .map(({ obj, index }) => {
        const image = obj as LayeredImage;
        return {
          id: image.layerId || `image_${index}`,
          name: image.layerName || '图片图层',
          visible: image.visible ?? true,
          locked: Boolean(image.lockMovementX) || Boolean(image.lockMovementY),
        zIndex: index,
        };
      });
  }, []);

  const findImageById = (id: string): LayeredImage | null => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return null;
    const objects = canvas.getObjects();
    for (const object of objects) {
      if (isLayeredImage(object) && object.layerId === id) {
        return object;
      }
    }
    return null;
  };

  const setLayerVisibility = useCallback((id: string, visible: boolean) => {
    const img = findImageById(id);
    if (!img) return;
    img.set('visible', visible);
    fabricCanvasRef.current?.renderAll();
  }, []);

  const setLayerLocked = useCallback((id: string, locked: boolean) => {
    const img = findImageById(id);
    if (!img) return;
    img.lockMovementX = locked;
    img.lockMovementY = locked;
    img.selectable = !locked;
    img.evented = !locked;
    fabricCanvasRef.current?.renderAll();
  }, []);

  const removeLayer = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    fabricCanvasRef.current?.remove(img);
    fabricCanvasRef.current?.renderAll();
  }, []);

  const bringForward = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    const canvas = fabricCanvasRef.current as CanvasWithLayerControls | null;
    if (!canvas || !isInitializedRef.current) return;
    canvas.bringForward(img);
    canvas.renderAll();
  }, []);

  const sendBackwards = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    const canvas = fabricCanvasRef.current as CanvasWithLayerControls | null;
    if (!canvas || !isInitializedRef.current) return;
    canvas.sendBackwards(img);
    canvas.renderAll();
  }, []);

  const bringToFront = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    const canvas = fabricCanvasRef.current as CanvasWithLayerControls | null;
    if (!canvas || !isInitializedRef.current) return;
    canvas.bringToFront(img);
    canvas.renderAll();
  }, []);

  const sendToBack = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    const canvas = fabricCanvasRef.current as CanvasWithLayerControls | null;
    if (!canvas || !isInitializedRef.current) return;
    canvas.sendToBack(img);
    canvas.renderAll();
  }, []);

  const selectLayer = useCallback((id: string) => {
    const img = findImageById(id);
    if (!img) return;
    fabricCanvasRef.current?.setActiveObject(img);
    fabricCanvasRef.current?.renderAll();
  }, []);

  const loadCanvasData = useCallback((data: string | Record<string, unknown>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    canvas.loadFromJSON(data, () => {
      canvas.renderAll();
    });
  }, []);

  const loadImageAsObject = useCallback((imageUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;

    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    })
      .then((img) => {
        const cW = canvas.getWidth();
        const cH = canvas.getHeight();
        const iW = img.width || 1;
        const iH = img.height || 1;

        const scale = Math.min((cW / iW) * 0.75, (cH / iH) * 0.75, 1);
        img.scale(scale);

        img.set({
          left: (cW - (img.width || 0) * (img.scaleX || 1)) / 2,
          top: (cH - (img.height || 0) * (img.scaleY || 1)) / 2,
        });

        const layered = img as LayeredImage;
        layered.layerId = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        layered.layerName = '图片图层';

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        onObjectAddedRef.current?.(img);
      })
      .catch((error) => {
        console.error('加载图片对象失败:', error);
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
    loadCanvasData,
    loadImageAsObject,
    loadImageAsBackground: loadImageAsObject,
    listImageLayers,
    setLayerVisibility,
    setLayerLocked,
    removeLayer,
    bringForward,
    sendBackwards,
    bringToFront,
    sendToBack,
    selectLayer,
    exportPoseImage,
    exportMaskImage,
  };
}
