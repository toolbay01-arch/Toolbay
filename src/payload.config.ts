// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { resendAdapter } from '@/lib/email/resend-adapter'
// import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// import { isSuperAdmin } from './lib/access';

import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders';
import { Sales } from './collections/Sales';
import { Tenants } from './collections/Tenants'
import { Reviews } from './collections/Reviews';
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { Transactions } from './collections/Transactions'
import { Messages } from './collections/Messages'
import { Conversations } from './collections/Conversations'
import { PushSubscriptions } from './collections/PushSubscriptions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    autoLogin: false,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterNavLinks: ['@/components/admin/UserVerificationBadge'],
    },
  },
  // Use Resend for both development and production
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || 're_B9Locd8M_ASuAoooS9D1RE8PTT89SYGqr',
    defaultFromAddress: 'onboarding@resend.dev',
    defaultFromName: 'Toolbay',
  }),
  collections: [Users, Media, Categories, Products, Tags, Tenants, Transactions, Orders, Reviews, Sales, Conversations, Messages, PushSubscriptions],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
    connectOptions: {
      maxPoolSize: 10,  // Maximum number of connections in the pool
      minPoolSize: 2,   // Minimum number of connections to maintain
      socketTimeoutMS: 45000,  // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      maxIdleTimeMS: 30000,  // Close idle connections after 30 seconds
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // Temporarily disable multi-tenant plugin to test
    // multiTenantPlugin({
    //   collections: {
    //     products: {},
    //     media: {},
    //     // Do NOT include tenants collection here - this should prevent filtering
    //   },
    //   tenantsArrayField: {
    //     includeDefaultField: false,
    //   },
    //   userHasAccessToAllTenants: (user) => isSuperAdmin(user),
    // }),
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
})
