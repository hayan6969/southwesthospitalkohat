import PatientLayout from "@/layouts/PatientLayout";
import { PatientIPDView } from "@/components/ipd/PatientIPDView";

export default function PatientIPD() {
  return (
    <PatientLayout>
      <PatientIPDView />
    </PatientLayout>
  );
}
