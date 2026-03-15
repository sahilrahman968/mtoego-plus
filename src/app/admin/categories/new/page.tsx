import PageHeader from "../../components/PageHeader";
import CategoryForm from "../CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <PageHeader title="New Category" description="Create a new product category" />
      <CategoryForm />
    </div>
  );
}
