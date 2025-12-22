import { NextRequest, NextResponse } from "next/server";
import { getPayloadSingleton } from "@/lib/payload-singleton";
import { headers as getHeaders } from "next/headers";

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const rdbCertificate = formData.get("rdbCertificate") as File;

    if (!rdbCertificate) {
      return NextResponse.json({ error: "RDB Certificate is required" }, { status: 400 });
    }

    // Convert File to Buffer for Payload
    const buffer = Buffer.from(await rdbCertificate.arrayBuffer());
    
    // Create media record in Payload (this will handle the upload)
    const media = await payload.create({
      collection: "media",
      data: {
        alt: "RDB Registration Certificate",
      },
      file: {
        data: buffer,
        mimetype: rdbCertificate.type,
        name: rdbCertificate.name,
        size: rdbCertificate.size,
      },
    });

    // Update tenant with RDB certificate
    await payload.update({
      collection: "tenants",
      id: userData.tenants[0].tenant as string,
      data: {
        rdbCertificate: media.id,
        verificationStatus: "pending", // Keep as pending until admin reviews
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Documents uploaded successfully. Your tenant is now pending verification.",
      mediaId: media.id 
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
