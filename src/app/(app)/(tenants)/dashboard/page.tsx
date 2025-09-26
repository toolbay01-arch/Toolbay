import { redirect } from "next/navigation";

import { caller } from "@/trpc/server";
import { isSuperAdmin } from "@/lib/access";
import { DocumentUpload } from "@/modules/tenants/ui/document-upload";

export const dynamic = "force-dynamic";

const TenantDashboardPage = async () => {
  const session = await caller.auth.session();

  if (!session.user) {
    redirect("/sign-in");
  }

  // Check if user is super admin - redirect them to admin dashboard
  if (isSuperAdmin(session.user)) {
    redirect("/all-tenants");
  }

  try {
    const tenant = await caller.tenants.getCurrentTenant();

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Tenant Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage your store verification and settings
            </p>
          </div>

          <div className="grid gap-8">
            {/* Store Information */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Store Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Store Name</label>
                  <p className="text-lg">{tenant.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Store Slug</label>
                  <p className="text-lg">{tenant.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">TIN Number</label>
                  <p className="text-lg">{tenant.tinNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Manager ID</label>
                  <p className="text-lg">{tenant.storeManagerId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-lg capitalize">{tenant.paymentMethod?.replace('_', ' ')}</p>
                </div>
                {tenant.paymentMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bank Name</label>
                      <p className="text-lg">{tenant.bankName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Number</label>
                      <p className="text-lg">{tenant.bankAccountNumber}</p>
                    </div>
                  </>
                )}
                {tenant.paymentMethod === 'momo_pay' && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">MOMO Pay Code</label>
                    <p className="text-lg">{tenant.momoPayCode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Upload Component */}
            <DocumentUpload 
              tenant={tenant} 
              onUploadComplete={() => {
                // Refresh the page to show updated status
                window.location.reload();
              }}
            />

            {/* Capabilities */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Store Capabilities</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span>Can Add Products</span>
                    <span className="text-xs text-gray-500">Requires document verification</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    tenant.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.isVerified ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span>Can Add Merchants</span>
                    <span className="text-xs text-gray-500">Requires document or physical verification</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    tenant.canAddMerchants ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.canAddMerchants ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {/* Verification Progress */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium mb-3">Verification Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${tenant.rdbCertificate ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">RDB Certificate Upload</span>
                    {tenant.rdbCertificate && <span className="text-xs text-green-600">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      tenant.verificationStatus === 'document_verified' || tenant.verificationStatus === 'physically_verified' 
                        ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-sm">Document Verification</span>
                    {(tenant.verificationStatus === 'document_verified' || tenant.verificationStatus === 'physically_verified') && 
                      <span className="text-xs text-green-600">✓</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      tenant.verificationStatus === 'physically_verified' ? 'bg-green-500' : 
                      tenant.physicalVerificationRequested ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-sm">Physical Verification</span>
                    {tenant.verificationStatus === 'physically_verified' && <span className="text-xs text-green-600">✓</span>}
                    {tenant.physicalVerificationRequested && tenant.verificationStatus !== 'physically_verified' && 
                      <span className="text-xs text-yellow-600">Requested</span>}
                  </div>
                </div>
              </div>
              
              {!tenant.isVerified && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    Complete the verification steps above to enable all store features.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    // If no tenant found, show create tenant message
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">No Tenant Found</h1>
          <p className="text-gray-600 mb-6">
            It looks like you don&apos;t have a store yet. Please contact support or create a new account.
          </p>
        </div>
      </div>
    );
  }
};

export default TenantDashboardPage;
