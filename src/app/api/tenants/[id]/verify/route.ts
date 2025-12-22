import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const body = await request.json();
    const { id } = await params;
    
    const { verificationStatus, verificationNotes, isVerified, verifiedAt } = body;
    
    // Update the tenant
    const updatedTenant = await payload.update({
      collection: 'tenants',
      id,
      data: {
        verificationStatus,
        verificationNotes,
        isVerified,
        verifiedAt,
        canAddMerchants: verificationStatus === 'document_verified' || verificationStatus === 'physically_verified',
      },
      overrideAccess: true, // Allow update regardless of access control
    });

    return NextResponse.json({ 
      success: true, 
      tenant: updatedTenant 
    });

  } catch (error) {
    console.error('Error updating tenant verification:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant verification' },
      { status: 500 }
    );
  }
}
