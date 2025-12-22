import { redirect } from 'next/navigation';

export default function CreateProductPage() {
  // Redirect to the native Payload admin product creation
  redirect('/admin/collections/products/create');
}
