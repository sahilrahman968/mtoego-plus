import PageHeader from "../../components/PageHeader";
import CouponForm from "../CouponForm";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Edit Coupon" description="Update coupon details" />
      <CouponForm couponId={id} />
    </div>
  );
}
