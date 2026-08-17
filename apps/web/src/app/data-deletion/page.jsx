import LegalPage from "../../components/legal/LegalPage";

const canonical = "https://www.storvex.rw/data-deletion";

export const metadata = {
  title: "Data Deletion Instructions — Storvex",
  description: "How to request deletion of personal information or a Storvex account.",
  alternates: { canonical },
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Data Deletion Instructions" intro="You can request deletion of personal information or a Storvex account by contacting our support team. Storvex is a product operated by RURAXIS.">
      <section><h2>How to submit a request</h2><ol><li>Email <a href="mailto:support@storvex.rw?subject=Data%20deletion%20request">support@storvex.rw</a>.</li><li>Use the subject line <strong>Data deletion request</strong>.</li><li>Include only the information reasonably needed to find the relevant record: your name, the email address or phone number associated with Storvex, the business or store name if applicable, and a brief description of what you want deleted.</li></ol><p className="legal-note"><strong>Do not email passwords, one-time codes, access tokens, API keys, or other secrets.</strong></p></section>
      <section><h2>Verification and response</h2><p>To protect accounts and personal information, we may ask for reasonable evidence that you are the account holder, an authorised business representative, or the person the information concerns. We will review the request, explain any information needed to complete it, and act in accordance with our role and applicable requirements.</p></section>
      <section><h2>Records controlled by a retailer</h2><p>A Storvex retailer or other business generally controls the customer, worker, supplier, and communications records it enters into the service. If your request concerns those records, contact that business directly when possible. You may still email us; we may coordinate with or direct the request to the relevant business so it can make the appropriate decision.</p></section>
      <section><h2>WhatsApp and Meta data</h2><p>If a business used Storvex to handle WhatsApp communications, identify the business and the relevant phone number in your request. We can address information held in Storvex and, where appropriate, help the business address information it controls.</p><p>Deleting information from Storvex does not independently delete information retained by Meta or another third party under its own terms, systems, or legal obligations. You may also need to use that provider’s privacy or account controls.</p></section>
      <section><h2>Information that may be retained</h2><p>Deletion may be limited where information is still reasonably needed for security, fraud prevention, legal compliance, dispute resolution, accounting or business records, enforcing agreements, or technical backup cycles. Where appropriate, access will be restricted or information will be de-identified until deletion is possible. We do not promise a single fixed completion period because the appropriate process depends on the request, verification, the business’s role, and applicable obligations.</p></section>
      <section className="legal-contact"><h2>Need help?</h2><p>Email <a href="mailto:support@storvex.rw?subject=Data%20deletion%20request">support@storvex.rw</a> with the subject <strong>Data deletion request</strong>.</p></section>
    </LegalPage>
  );
}
