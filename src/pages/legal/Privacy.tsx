import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";
import { LegalLayout, Missing } from "./LegalLayout";

function Basis({ children }: { children: string }) {
  return (
    <>
      {children}
      {!LEGAL.legalBasesReviewed && <em> (proposed, pending legal review)</em>}
    </>
  );
}

export default function Privacy() {
  const op = LEGAL.operator;
  const days = LEGAL.inactiveAccountDeletionDays;

  return (
    <LegalLayout title="Privacy Notice">
      <p>
        ONboard is a job-application tracker with optional AI tools. It is currently a free, non-commercial beta
        run by one individual developer. This notice explains what personal data the app processes, why, who
        receives it, and what you can do about it.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        Controller: {op.name ?? <Missing what="full name" />}
        <br />
        Address: {op.postalAddress ?? <Missing what="postal address" />}
        <br />
        Email: <a href={`mailto:${op.email}`}>{op.email}</a>
      </p>
      <p>No data protection officer has been appointed.</p>

      <h2>2. What we process and why</h2>

      <h3>Your account</h3>
      <p>
        Email address, a password (stored only as a hash by the authentication service), an optional display
        name, and timestamps such as sign-up and last sign-in. If you use <strong>Continue with Google</strong>,
        Google shares your name, email address and profile picture with us (sign-in scopes "openid email
        profile"); the sign-in is handled by Lovable's sign-in service (oauth.lovable.app). ONboard does{" "}
        <strong>not</strong> get access to your Gmail, Google Drive, Calendar or any other Google data.
        <br />
        Purpose: creating and securing your account. Legal basis: <Basis>Art. 6(1)(b) GDPR (contract)</Basis>.
      </p>

      <h3>Job tracker data</h3>
      <p>
        Jobs you add (company, role, link, status, dates, location, description, your notes, rejection reasons,
        AI match scores), CV version names and notes, and API tokens you create (we store only a hash and a short
        prefix of each token).
        <br />
        Purpose: providing the tracker and its statistics. Legal basis: <Basis>Art. 6(1)(b) GDPR</Basis>.
      </p>

      <h3>Your CV</h3>
      <p>
        If you upload a CV, we store the original file and the text your browser extracts from it. Please
        do not include information you do not need for job applications (for example health data, religion or
        a photo). Purpose: using your CV in the tracker and, only if you turn them on, the AI tools. Legal
        basis: <Basis>Art. 6(1)(b) GDPR</Basis>.
      </p>

      <h3>Optional AI features (off by default)</h3>
      <p>
        AI features are switched off until you turn them on in <em>Settings → Privacy &amp; data</em>, and you
        can turn them off again at any time. The tracker works fully without them. When they are on, the
        content you choose to process is sent — at the moment you click an AI button — through Lovable's AI
        gateway to an AI model provider (currently Google Gemini models; the gateway can route requests to
        other providers). Before first use of each tool, the app shows exactly which content that tool sends.
        Email addresses, phone numbers and links are removed from CV text before it is sent. In the chat, your
        CV is only included if you switch on <em>Share my CV</em>.
        <br />
        AI requests are processed in the USA (see section 4). Lovable keeps a summary of every AI request
        and, while its "AI app context" setting is on, the full request and response for up to 90 days.
        Lovable states that data of app users is not used to train its models and that its contracts with
        model providers prohibit training on it.
        {LEGAL.lovableAiAppContext === "disabled"
          ? " We have turned this setting off."
          : LEGAL.lovableAiAppContext === "enabled"
            ? " This setting is currently on."
            : <> Status of this setting: <Missing what="confirm whether AI app context is off" /></>}
        <br />
        Legal basis: <Basis>Art. 6(1)(a) GDPR (consent, by turning AI features on)</Basis>. AI results (for
        example match scores) are suggestions only; no decision with legal or similarly significant effect is
        made automatically.
      </p>

      <h3>Company logos (optional, off by default)</h3>
      <p>
        If you turn on <em>Load company logos</em>, your browser requests logos for the companies on your board
        from Brandfetch, logo.dev, Clearbit and Google's favicon service. These services then see your IP
        address and the company's web domain. When off, the app shows initials instead and makes no such
        requests. Legal basis: <Basis>Art. 6(1)(a) GDPR</Basis>.
      </p>

      <h3>Storage on your device</h3>
      <p>
        The app stores in your browser's local storage only what it needs to work: your sign-in session, your
        settings (theme, language, date format), the AI chat history (kept only on this device — it is not
        saved on our servers), and small interface states. We do not use advertising or tracking cookies in
        the app. Legal basis for device access: § 25(2) no. 2 TDDDG (strictly necessary for the service you
        requested). You can delete the chat history in Settings at any time.
      </p>

      <h3>Demo mode (no account)</h3>
      <p>
        If you use <em>Try the demo</em>, no account is created. The sample data and anything you change are kept
        only in your browser tab (session storage) and are discarded when you close it; nothing is sent to our
        backend, and AI tools and company logos are switched off. Only the normal hosting data described below is
        processed when the page loads.
      </p>

      <h3>Hosting, security and logs</h3>
      <p>
        When you use ONboard, our hosting providers process technical data such as your IP address, browser
        type, request times and error information, and keep logs of requests to the backend. Cloudflare may set
        a short-lived <code>__cf_bm</code> cookie to detect bots. Purpose: delivering and securing the service.
        Legal basis: <Basis>Art. 6(1)(f) GDPR (legitimate interest in a secure, working service)</Basis>.
      </p>
      <p>
        Lovable's hosting can add its own visitor analytics and error reporting to published apps. Visitor
        analytics for ONboard:{" "}
        {LEGAL.lovableVisitorAnalytics === "disabled"
          ? "turned off."
          : LEGAL.lovableVisitorAnalytics === "enabled"
            ? "currently on."
            : <Missing what="confirm that Lovable visitor analytics is turned off" />}
      </p>

      <h3>Emails and feedback</h3>
      <p>
        The authentication service sends emails needed for your account (for example confirmation and password
        reset). If you email us feedback, we use your message and address only to reply.
      </p>

      <h2>3. Who receives data</h2>
      <ul>
        <li>
          <strong>Lovable</strong> (lovable.dev) — hosts the app and its backend
          ("Lovable Cloud": database, authentication, file storage, server functions, logs) and operates the AI
          gateway. Lovable's backend runs on <strong>Supabase</strong> (EU). Lovable's email providers deliver
          account emails such as password resets.
        </li>
        <li>
          <strong>Google Cloud (Vertex AI)</strong>, which runs the Gemini models behind Lovable's AI gateway, in
          the USA — only when you use an AI feature.
        </li>
        <li><strong>Cloudflare</strong> — content delivery and protection for the hosted app.</li>
        <li><strong>Google</strong> — only if you sign in with Google.</li>
        <li><strong>Logo services</strong> listed above — only if you turn logos on.</li>
      </ul>
      <p>
        We do not sell your data and do not share it for advertising. Lovable's full list of sub-processors:{" "}
        <a href="https://trust.lovable.dev/subprocessors" target="_blank" rel="noreferrer">trust.lovable.dev/subprocessors</a>.
        {LEGAL.lovableDpaInPlace
          ? " A data processing agreement with Lovable is in place."
          : <> There is currently no data processing agreement with Lovable in our name; on our plan, Lovable's
            Terms of Service and Privacy Policy apply. <Missing what="data processing agreement (requires a Lovable Business plan)" /></>}
      </p>

      <h2>4. Where data is processed</h2>
      <p>
        App database and files: {LEGAL.databaseRegion ?? <Missing what="confirmed database region" />}. AI
        requests enter Lovable's gateway in the EU and are processed by Google (Vertex AI) in the USA. For
        transfers outside the EU, Lovable relies on the EU Standard Contractual Clauses it holds with its own
        providers (Lovable Privacy Policy, section 12); Lovable is not certified under the EU–US Data Privacy
        Framework. Whether these safeguards are sufficient is part of the pending legal review.
      </p>

      <h2>5. How long we keep data</h2>
      <ul>
        <li>Account, tracker data and CV: until you delete them or your account.</li>
        <li>
          Inactive accounts:{" "}
          {days
            ? <>deleted after {days} days without any activity.{!LEGAL.retentionCleanupScheduled && <> <Missing what="automatic deletion not running yet" /></>}</>
            : <Missing what="retention period not decided yet" />}
        </li>
        <li>AI chat history: only in your browser, until you delete it or clear your browser data.</li>
        <li>AI request records at Lovable: see section 2; Lovable does not publish how long it keeps request summaries.</li>
        <li>
          Logs and backups: Lovable does not publish retention periods for them. Deleting your account makes your
          data inaccessible right away; Lovable removes it from backup copies after a holding period it does not
          publish. Deleted CV files are removed immediately (file storage is not backed up). Individual log
          entries cannot be deleted on request.
        </li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        You have the right to access, rectify and erase your data, to restrict or object to processing, to data
        portability, and to withdraw consent at any time (this does not affect processing before withdrawal).
        In the app you can:
      </p>
      <ul>
        <li>download a copy of your data (<em>Settings → Privacy &amp; data → Download my data</em>),</li>
        <li>turn AI features and company logos off,</li>
        <li>delete your AI chat history on a device,</li>
        <li>delete your account and all its data (<em>Settings → Account → Delete account</em>).</li>
      </ul>
      <p>
        For anything else, email <a href={`mailto:${op.email}`}>{op.email}</a>. You also have the right to lodge
        a complaint with a data protection supervisory authority, in particular in the EU member state where
        you live or work.
      </p>

      <h2>7. Do you have to provide data?</h2>
      <p>
        An email address (or a Google account) is needed to create an account. Everything else is up to you.
        AI features are optional.
      </p>

      <h2>8. Changes</h2>
      <p>
        We will update this notice when the app changes and show the date above. See also the{" "}
        <Link to="/terms">Terms</Link> and <Link to="/imprint">Imprint</Link>.
      </p>
    </LegalLayout>
  );
}
