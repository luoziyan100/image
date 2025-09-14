# Canvas and AI Model Interaction Logic Modification Plan

## 1. Objective

To fix the broken canvas and AI model interaction logic, enabling users to generate images from their drawings on the canvas.

## 2. Analysis

The current implementation has the following issues:

1.  **Frontend Not Connected to Backend:** The `handleStartGeneration` function in `CreationWorkspace.tsx` is a mock implementation and does not send any data to the backend.
2.  **Incorrect Data Sent to Backend:** The backend API at `/api/generate` expects `canvasData` (a JSON representation of the canvas), but the AI service requires an image file. The API then fails to create a proper `imageBuffer` to the worker queue.
3.  **Inefficient Data Flow:** The frontend generates both `canvasData` (JSON) and `imageData` (base64). Sending the JSON data to the backend and then converting it to an image on the server is inefficient and complex. It's better to send the `imageData` directly.

## 3. Proposed Changes

I propose a three-phase approach to fix these issues.

### Phase 1: Frontend Changes (`CreationWorkspace.tsx`)

The first step is to connect the frontend to the backend. I will modify the `handleStartGeneration` function in `src/components/CreationWorkspace.tsx` to send the canvas image data and other relevant information to the `/api/generate` endpoint.

**File to Modify:** `src/components/CreationWorkspace.tsx`

**Changes:**

1.  **Import `axios` or use `fetch`:** To make HTTP requests.
2.  **Update `handleStartGeneration`:**
    *   Get the `canvasImageData`, `prompt`, and `currentProject.id` from the component's state and the `useAppStore`.
    *   Make a POST request to `/api/generate`.
    *   Handle the response and show notifications to the user.

**Example Code Snippet:**

```typescript
// src/components/CreationWorkspace.tsx

// ... imports

const handleStartGeneration = useCallback(async () => {
  if (!canvasImageData) {
    actions.showNotification({
      type: 'error',
      message: 'Canvas is empty. Please draw something first.',
    });
    return;
  }

  actions.setGenerating(true);
  setCreationMessage('✨ Sending your creation to the AI...');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: currentProject.id,
        imageData: canvasImageData,
        prompt: 'A beautiful painting of a cat.', // Replace with actual prompt
      }),
    });

    const result = await response.json();

    if (result.success) {
      actions.showNotification({
        type: 'success',
        message: '🎉 Generation started! You can check the progress in the gallery.',
      });
    } else {
      actions.showNotification({
        type: 'error',
        message: `Generation failed: ${result.message}`,
      });
    }
  } catch (error) {
    console.error('Generation request failed:', error);
    actions.showNotification({
      type: 'error',
      message: 'Failed to start generation. Please try again.',
    });
  } finally {
    actions.setGenerating(false);
    setCreationMessage('');
  }
}, [actions, canvasImageData, currentProject]);
```

### Phase 2: Backend API Changes (`/api/generate/route.ts`)

Next, I will update the backend API to accept the `imageData` (base64 string) instead of `canvasData` (JSON).

**File to Modify:** `src/app/api/generate/route.ts`

**Changes:**

1.  **Update Request Body:** Expect `imageData` instead of `canvasData`.
2.  **Update `GenerationJobData`:** Modify the type to include `imageData`.
3.  **Update Job Payload:** Pass the `imageData` to the `addImageGenerationJob`.

**Example Code Snippet:**

```typescript
// src/app/api/generate/route.ts

// ... imports

export async function POST(req: NextRequest) {
  try {
    // ... budget check

    const body = await req.json();
    const { projectId, imageData, prompt } = body; // Changed from canvasData to imageData

    if (!projectId || !imageData) {
      // ... error handling
    }

    // ... withDatabase
      // 1. No need to save the sketch to MongoDB anymore, as we have the image data.
      //    Alternatively, we can save the base64 image data.

      // 2. Create Asset record
      const asset = await createAsset({
        projectId,
        // sourceSketchId: sketchId, // This can be removed or adapted
        positionInProject: 0
      });

      // 3. Prepare task data
      const jobData: GenerationJobData = {
        assetId: asset.id,
        sketchData: {
          imageBuffer: Buffer.from(imageData.split(',')[1], 'base64'), // Convert base64 to buffer
          prompt: prompt || 'A beautiful painting.'
        },
        options: {
          quality: 'high'
        }
      };

      // 4. Add to queue
      const queueManager = QueueManager.getInstance();
      const job = await queueManager.addImageGenerationJob(jobData);

      // ... return response
    // ...
  } catch (error) {
    // ... error handling
  }
}
```

### Phase 3: Worker Changes (`image-generation-service.ts`)

Finally, I will ensure the worker can correctly process the `imageData`. The `processImageGeneration` function in `src/lib/image-generation-service.ts` already expects an `imageBuffer`, which is what we are now providing. The change in the API route to convert the base64 `imageData` to a `Buffer` should be sufficient. No changes are likely needed in this file, but it's important to verify.

**File to Verify:** `src/lib/image-generation-service.ts`

**Verification:**

*   Confirm that `processImageGeneration` receives a `Buffer` object for the `imageBuffer` parameter.
*   Confirm that `NanoBananaService` can handle the `Buffer` correctly (it expects a base64 string, so we need to convert it back).

**Example Code Snippet (if changes are needed):**

```typescript
// src/lib/image-generation-service.ts

// ... imports

export async function processImageGeneration(params: ProcessImageGenerationParams): Promise<GenerateImageResult> {
  const nanoBanana = new NanoBananaService(process.env.NANO_BANANA_API_KEY!);

  // The imageBuffer is already a Buffer, convert it to base64 for the API
  const imageData = params.imageBuffer.toString('base64');

  const enhancedPrompt = enhancePrompt(params.prompt);

  const result = await nanoBanana.generateImage({
    prompt: enhancedPrompt,
    imageData: imageData,
    mode: 'image-to-image',
    quality: 'high',
    aspectRatio: '1:1'
  });

  return result;
}
```

## 4. Rationale

These changes will:

*   **Enable the core functionality** of the application.
*   **Improve efficiency** by sending only the necessary data (the image) to the backend.
*   **Simplify the backend logic** by removing the need to process Fabric.js JSON data on the server.
*   **Fix the bug** where an empty `imageBuffer` was being sent to the worker.

## 5. Next Steps

1.  Implement the changes described above.
2.  Test the end-to-end flow:
    *   Draw on the canvas.
    *   Click the "Generate" button.
    *   Verify that a new image is generated and appears in the gallery.
    *   Check the server logs for any errors.
