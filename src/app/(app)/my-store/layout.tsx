import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Store",
  description: "Quick links for managing your account, purchases, products, and sales.",
};

export default function MyStoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


