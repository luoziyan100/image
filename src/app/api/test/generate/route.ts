import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    // Mock AI generation response
    const mockResponse = {
      success: true,
      data: {
        imageUrl: 'https://example.com/generated-image.jpg',
        processingTimeMs: 1500 + Math.random() * 1000,
        model: 'nano-banana-v1',
        prompt: prompt || '测试提示词'
      }
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('Test generate error:', error);
    return NextResponse.json({
      success: false,
      error: 'TEST_GENERATE_FAILED',
      message: '测试生成失败'
    }, { status: 500 });
  }
}