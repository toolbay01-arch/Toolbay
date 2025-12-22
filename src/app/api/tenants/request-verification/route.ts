import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    
    // Get user from request
    const { user } = await payload.auth({ headers: request.headers });
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the tenant associated with this user
    let tenantId: string | null = null;
    
    if (user.tenants && user.tenants.length > 0) {
      const firstTenant = user.tenants[0];
      if (firstTenant) {
        tenantId = typeof firstTenant.tenant === 'string' ? firstTenant.tenant : firstTenant.tenant?.id || null;
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Get current tenant to check status
    const currentTenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
    });

    // Check if already verified
    if (currentTenant.verificationStatus === 'document_verified' || currentTenant.verificationStatus === 'physically_verified') {
      return NextResponse.json({ 
        error: 'Tenant is already verified',
        status: currentTenant.verificationStatus 
      }, { status: 400 });
    }

    // Update tenant to mark verification as requested
    const updatedTenant = await payload.update({
      collection: 'tenants',
      id: tenantId,
      data: {
        verificationRequested: true,
        verificationRequestedAt: new Date().toISOString(),
        verificationStatus: 'pending', // Ensure status is pending when requested
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      overrideAccess: true,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Verification request submitted successfully',
      tenant: updatedTenant 
    });

  } catch (error) {
    console.error('Error requesting tenant verification:', error);
    return NextResponse.json(
      { error: 'Failed to request verification' },
      { status: 500 }
    );
  }
}

// GET endpoint to check verification status
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    
    // Get user from request
    const { user } = await payload.auth({ headers: request.headers });
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the tenant associated with this user
    let tenantId: string | null = null;
    
    if (user.tenants && user.tenants.length > 0) {
      const firstTenant = user.tenants[0];
      if (firstTenant) {
        tenantId = typeof firstTenant.tenant === 'string' ? firstTenant.tenant : firstTenant.tenant?.id || null;
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Get current tenant verification status
    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
    });

    return NextResponse.json({ 
      success: true,
      verification: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (tenant as any).verificationStatus || 'pending',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requested: (tenant as any).verificationRequested || false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestedAt: (tenant as any).verificationRequestedAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isVerified: (tenant as any).isVerified || false,
      }
    });

  } catch (error) {
    console.error('Error getting tenant verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}