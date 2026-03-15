import PageHeader from "../../components/PageHeader";
import ProductForm from "../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Edit Product" description="Update product details" />
      <ProductForm productId={id} />
    </div>
  );
}
