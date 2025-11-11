import { CartView } from "@/modules/checkout/ui/views/cart-view";

interface CartPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { slug } = await params;

  return <CartView tenantSlug={slug} />;
}
