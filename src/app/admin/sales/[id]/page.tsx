import PageHeader from "../../components/PageHeader";
import SaleForm from "../SaleForm";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Edit sale" description="Update products, pricing, schedule, and merchandising" />
      <SaleForm saleId={id} />
    </div>
  );
}
