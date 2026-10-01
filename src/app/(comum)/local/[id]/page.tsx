import { notFound, redirect } from "next/navigation";
import { LocationFieldView } from "@/components/location-field-view";
import { isLeader, requireUser } from "@/lib/auth";
import { getLocationOverview } from "@/lib/location-data";

export const metadata = { title: "Local" };

export default async function FieldLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (isLeader(user)) redirect(`/locais/${id}`);
  const loc = await getLocationOverview({ id });
  if (!loc) notFound();
  return <LocationFieldView loc={loc} user={user} />;
}
