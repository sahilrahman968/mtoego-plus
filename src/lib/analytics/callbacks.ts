import CallbackRequest from "@/models/callback-request.model";
import { LIST_LIMIT } from "@/lib/analytics/constants";
import { avg, median, round2 } from "@/lib/analytics/format";

export async function getCallbackPipeline() {
  const [byStatus, openCount, latencyDocs, openList] = await Promise.all([
    CallbackRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    CallbackRequest.countDocuments({ status: "new" }),
    CallbackRequest.find({
      contactedAt: { $exists: true, $ne: null },
    })
      .select("createdAt contactedAt")
      .lean(),
    CallbackRequest.find({ status: "new" })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .select("requirement phone contactHours sourceUrl createdAt")
      .lean(),
  ]);

  const statusCounts: Record<string, number> = { new: 0, contacted: 0, closed: 0 };
  for (const row of byStatus) {
    statusCounts[row._id] = row.count;
  }

  const hours = latencyDocs
    .filter((d) => d.contactedAt)
    .map(
      (d) =>
        (new Date(d.contactedAt!).getTime() - new Date(d.createdAt).getTime()) /
        (1000 * 60 * 60)
    );

  return {
    byStatus: statusCounts,
    openCount,
    contactLatency: {
      avgHours: avg(hours) !== null ? round2(avg(hours)!) : null,
      medianHours: median(hours) !== null ? round2(median(hours)!) : null,
      sampleSize: hours.length,
    },
    openRequests: openList.map((r) => ({
      _id: String(r._id),
      requirement: r.requirement.slice(0, 120),
      phone: r.phone,
      contactHours: r.contactHours,
      sourceUrl: r.sourceUrl || "",
      createdAt: r.createdAt.toISOString(),
      ageHours: round2(
        (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60)
      ),
    })),
  };
}

export async function getOpenCallbackCount() {
  return CallbackRequest.countDocuments({ status: "new" });
}
