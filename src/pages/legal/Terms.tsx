import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";
import { LegalLayout, Missing } from "./LegalLayout";

export default function Terms() {
  const op = LEGAL.operator;

  return (
    <LegalLayout title="Terms of Use (Beta)">
      <h2>1. What ONboard is</h2>
      <p>
        ONboard is a job-application tracker with optional AI tools, offered by{" "}
        {op.name ?? <Missing what="operator's full name" />} as a free, non-commercial beta for testing. There
        are no paid plans during the beta; any pricing shown in the app is a preview and cannot be purchased.
      </p>

      <h2>2. Beta status</h2>
      <p>
        Features may change, break or be removed, and the beta may end. Please keep your own copies of anything
        important — you can download your data at any time in Settings. We will try to announce the end of the
        beta in advance.
      </p>

      <h2>3. Your account and content</h2>
      <ul>
        <li>Keep your sign-in details to yourself and tell us if you suspect misuse.</li>
        <li>Only add content you are allowed to use. Do not upload other people's personal data beyond what a normal job search requires.</li>
        <li>You keep all rights to your content. You let us store and process it only to run the service for you.</li>
        <li>Do not misuse the service (for example attacks, automated mass requests, or attempts to access other users' data).</li>
      </ul>

      <h2>4. AI features</h2>
      <p>
        AI features are optional and off until you turn them on. AI output can be wrong, incomplete or invented.
        Check everything before you use it in an application. Match scores and suggestions are not professional
        career, legal or financial advice.
      </p>

      <h2>5. Ending use</h2>
      <p>
        You can delete your account at any time in Settings. We may suspend accounts that break these terms or
        put the service or other users at risk.
      </p>

      <h2>6. Liability</h2>
      <p>
        <Missing what="liability and governing-law clause — needs legal review (German consumer law limits disclaimers)" />
      </p>

      <h2>7. Privacy</h2>
      <p>
        How we handle personal data is described in the <Link to="/privacy">Privacy Notice</Link>.
      </p>

      <h2>8. Contact</h2>
      <p>
        <a href={`mailto:${op.email}`}>{op.email}</a> — see also the <Link to="/imprint">Imprint</Link>.
      </p>
    </LegalLayout>
  );
}
