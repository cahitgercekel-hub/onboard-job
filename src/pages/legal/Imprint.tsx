import { LEGAL } from "@/lib/legal";
import { LegalLayout, Missing } from "./LegalLayout";

export default function Imprint() {
  const op = LEGAL.operator;

  return (
    <LegalLayout title="Imprint / Impressum">
      <p>Information pursuant to § 5 DDG (Digitale-Dienste-Gesetz)</p>
      <p>
        {op.name ?? <Missing what="full name" />}
        <br />
        {op.postalAddress ?? <Missing what="postal address (no P.O. box)" />}
      </p>
      <p>
        Email: <a href={`mailto:${op.email}`}>{op.email}</a>
      </p>
    </LegalLayout>
  );
}
