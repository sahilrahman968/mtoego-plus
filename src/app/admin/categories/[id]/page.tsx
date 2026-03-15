import PageHeader from "../../components/PageHeader";
import CategoryForm from "../CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Edit Category" description="Update category details" />
      <CategoryForm categoryId={id} />
    </div>
  );
}
