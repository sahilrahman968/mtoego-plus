import PageHeader from "../../components/PageHeader";
import CouponForm from "../CouponForm";

export default function NewCouponPage() {
  return (
    <div>
      <PageHeader title="New Coupon" description="Create a new discount coupon" />
      <CouponForm />
    </div>
  );
}
