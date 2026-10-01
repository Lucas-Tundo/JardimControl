import { getFormOptions } from "@/lib/queries";
import { LocationForm } from "@/components/location-forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Novo local" };

export default async function NewLocationPage() {
  const options = await getFormOptions();
  return (
    <>
      <PageHeader title="Novo local" subtitle="Cada local recebe automaticamente um QR Code único." back="/locais" />
      <LocationForm options={options} />
    </>
  );
}
