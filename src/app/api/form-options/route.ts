import { NextRequest, NextResponse } from "next/server";
import { getPayloadSingleton } from "@/lib/payload-singleton";

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayloadSingleton();
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'categories') {
      const categories = await payload.find({
        collection: 'categories',
        limit: 100,
      });
      
      return NextResponse.json(categories.docs);
    }

    if (type === 'tags') {
      const tags = await payload.find({
        collection: 'tags',
        limit: 100,
      });
      
      return NextResponse.json(tags.docs);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
