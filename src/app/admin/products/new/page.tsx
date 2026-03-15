import PageHeader from "../../components/PageHeader";
import ProductForm from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="New Product" description="Add a new product to your catalog" />
      <ProductForm />
    </div>
  );
}
