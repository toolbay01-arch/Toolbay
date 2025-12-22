import { NextResponse } from "next/server";
import { getPayloadSingleton } from "@/lib/payload-singleton";
import { headers as getHeaders } from "next/headers";

export async function POST() {
  try {
    const payload = await getPayloadSingleton();
    const headers = await getHeaders();
    
    // Check authentication
    const session = await payload.auth({ headers });
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tenant
    const userData = await payload.findByID({
      collection: "users",
      id: session.user.id,
    });

    if (!userData.tenants?.[0]) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 });
    }

    // Update tenant to request physical verification
    await payload.update({
      collection: "tenants",
      id: userData.tenants[0].tenant as string,
      data: {
        physicalVerificationRequested: true,
        physicalVerificationRequestedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Physical verification requested successfully" 
    });
  } catch (error) {
    console.error("Physical verification request error:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
