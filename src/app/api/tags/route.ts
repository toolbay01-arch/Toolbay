import { NextRequest, NextResponse } from "next/server";
import { getPayloadSingleton } from '@/lib/payload-singleton';

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayloadSingleton();
    
    // Get query parameters for searching/filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await payload.find({
      collection: 'tags',
      limit,
      sort: 'name',
      where: search ? {
        name: {
          contains: search,
        },
      } : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadSingleton();
    const body = await request.json();
    
    const result = await payload.create({
      collection: 'tags',
      data: body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
