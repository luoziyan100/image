# Image Zoom Feature Fix Plan

## 1. Objective

To fix the image zoom feature so that clicking the generated image opens a lightbox, allowing users to view a larger version of the image.

## 2. Analysis

The existing `ImagePreview` component and `useImagePreview` hook are correctly implemented. However, an overlay element with the text "点击放大查看" (Click to zoom) is displayed on top of the generated image. This overlay is capturing the mouse clicks, preventing the `onClick` event handler on the `img` element from being triggered.

## 3. Proposed Changes

To fix this issue, I will make the overlay transparent to mouse events by adding the `pointer-events-none` Tailwind CSS utility class to it.

**File to Modify:** `src/components/AIGenerationDemo.tsx`

**Change:**

Locate the `div` element that represents the overlay and add the `pointer-events-none` class to its `className` attribute.

**Current Code:**

```typescript
<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
  <div className="bg-white bg-opacity-90 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 flex items-center gap-2">
    <span>🔍</span>
    <span>点击放大查看</span>
  </div>
</div>
```

**Modified Code:**

```typescript
<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
  <div className="bg-white bg-opacity-90 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 flex items-center gap-2">
    <span>🔍</span>
    <span>点击放大查看</span>
  </div>
</div>
```

## 4. Rationale

The `pointer-events-none` class will make the overlay element and its children ignore pointer events. This will allow the click event to "pass through" the overlay and be captured by the `img` element underneath it. As a result, the `openPreview` function will be called as expected, and the lightbox will open.

This is a simple and effective solution that doesn't require any changes to the component's logic or state management.

## 5. Next Steps

1.  Apply the change to `src/components/AIGenerationDemo.tsx`.
2.  Test the image zoom functionality by clicking on a generated image.
3.  Verify that the lightbox opens and displays the larger image.