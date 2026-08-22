import PageHeader from "../../components/PageHeader";
import SaleForm from "../SaleForm";

export default function NewSalePage() {
  return (
    <div>
      <PageHeader
        title="New sale"
        description="Schedule a campaign, set sale prices, and publish a landing URL"
      />
      <SaleForm />
    </div>
  );
}
