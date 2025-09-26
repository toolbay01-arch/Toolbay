import { redirect } from "next/navigation";
import Link from "next/link";

import { caller } from "@/trpc/server";
import { isSuperAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

const AllTenantsPage = async () => {
  const session = await caller.auth.session();

  if (!session.user || !isSuperAdmin(session.user)) {
    redirect("/");
  }

  try {
    const allTenants = await caller.tenants.getAllTenants();

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'document_verified': return 'bg-blue-100 text-blue-800';
        case 'physically_verified': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Pending';
        case 'document_verified': return 'Document Verified';
        case 'physically_verified': return 'Physically Verified';
        case 'rejected': return 'Rejected';
        default: return 'Unknown';
      }
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">All Tenants</h1>
              <p className="text-gray-600 mt-2">
                Manage and view all registered tenants ({allTenants.docs.length} total)
              </p>
            </div>
            <div className="space-x-4">
              <Link 
                href="/verify-tenants"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Pending Verifications
              </Link>
              <Link 
                href="/admin"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Admin Panel
              </Link>
            </div>
          </div>

          {allTenants.docs.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">No Tenants Found</h3>
              <p className="text-gray-500">No tenants have been registered yet.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {allTenants.docs.map((tenant) => (
                  <li key={tenant.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {tenant.name?.charAt(0)?.toUpperCase() || 'T'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {tenant.name || 'Unnamed Tenant'}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {tenant.slug} • TIN: {tenant.tinNumber}
                              </p>
                              <p className="text-xs text-gray-400">
                                Created: {new Date(tenant.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Verification Status */}
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.verificationStatus || 'pending')}`}>
                              {getStatusText(tenant.verificationStatus || 'pending')}
                            </span>
                            
                            {tenant.isVerified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                ✓ Verified
                              </span>
                            )}
                            
                            {tenant.physicalVerificationRequested && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                📍 Physical Requested
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Link
                              href={`/admin/collections/tenants/${tenant.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/tenant-details/${tenant.id}`}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Manager ID:</span> {tenant.storeManagerId || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Payment:</span> {tenant.paymentMethod?.replace('_', ' ') || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Documents:</span> {tenant.rdbCertificate ? '✓' : '✗'}
                        </div>
                        <div>
                          <span className="font-medium">Merchants:</span> {tenant.canAddMerchants ? 'Allowed' : 'Not Allowed'}
                        </div>
                      </div>
                      
                      {tenant.verificationNotes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {tenant.verificationNotes}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading tenants:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Tenants</h1>
          <p className="text-gray-600 mt-2">
            Unable to load tenant information. Please try again later.
          </p>
          <pre className="mt-4 text-xs bg-gray-100 p-4 rounded">
            {error instanceof Error ? error.message : 'Unknown error'}
          </pre>
        </div>
      </div>
    );
  }
};

export default AllTenantsPage;
