import Link from "next/link";

import LegalPage from "../../components/legal/LegalPage";

const canonical = "https://www.storvex.rw/privacy";

export const metadata = {
  title: "Privacy Policy — Storvex",
  description: "How Storvex collects, uses, shares, retains, and protects personal information.",
  alternates: { canonical },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains how personal information is handled when people use Storvex. Storvex is a product operated by RURAXIS."
    >
      <section><h2>1. Who we are</h2><p>RURAXIS operates Storvex, a service that helps businesses manage sales, stock, cash, staff activity, branches, customer records, supplier records, reports, and related communications. In this policy, “Storvex,” “we,” “us,” and “our” refer to RURAXIS in its operation of the Storvex product.</p><p>Questions about this policy can be sent to <a href="mailto:support@storvex.rw">support@storvex.rw</a>.</p></section>

      <section><h2>2. Scope</h2><p>This policy applies to the Storvex website, business management service, public Marketplace, support interactions, and optional communications features such as WhatsApp. It does not govern services that a third party provides under its own privacy policy.</p></section>

      <section><h2>3. Information we handle</h2><ul><li><strong>Account and identity information:</strong> names, email addresses, phone numbers, login and account details, roles, and business affiliation.</li><li><strong>Business records:</strong> product, inventory, sales, expense, cash, branch, worker, customer, and supplier information entered into Storvex.</li><li><strong>Communications:</strong> support requests and, when enabled, message content, recipient details, delivery events, templates, and related WhatsApp communication records.</li><li><strong>Marketplace information:</strong> store and product information businesses choose to publish, and enquiry or contact information submitted by visitors.</li><li><strong>Technical and usage information:</strong> device, browser, IP address, logs, diagnostics, security events, and how the service is used.</li><li><strong>AI feature information:</strong> prompts, content, and relevant business context submitted when an optional AI-powered feature is used.</li></ul></section>

      <section><h2>4. Where information comes from</h2><p>We receive information directly from account holders and users, from the businesses that use Storvex, from visitors to public Marketplace pages, automatically from use of the service, and from connected providers such as Meta when a business enables an integration.</p></section>

      <section><h2>5. How we use information</h2><ul><li>Provide, operate, maintain, and improve Storvex.</li><li>Authenticate users and administer accounts, permissions, subscriptions, and support.</li><li>Process business records and produce the views, reports, and workflows requested by a business.</li><li>Enable optional communications and AI-powered features.</li><li>Publish business-selected Marketplace listings and facilitate enquiries between visitors and businesses.</li><li>Protect the service, investigate misuse, debug problems, and meet applicable legal obligations.</li><li>Send service messages and respond to questions.</li></ul></section>

      <section><h2>6. Our role and the business’s role</h2><p>For account administration, product operation, security, and our own business activities, RURAXIS determines why and how relevant personal information is handled. When a business enters or connects customer, worker, supplier, or communications data to use Storvex, that business generally decides the purposes for which the data is used, and Storvex processes it on the business’s instructions. Individuals may therefore need to contact the relevant business about records that business controls.</p></section>

      <section><h2>7. WhatsApp and Meta</h2><p>A business may choose to connect WhatsApp features. When it does, Storvex may exchange business account identifiers, phone number information, message templates, message content, recipient information, and delivery or status events with Meta to provide the requested functionality. The business is responsible for having an appropriate basis to contact recipients, obtaining any required consent, and following applicable WhatsApp and Meta terms and policies.</p><p>WhatsApp availability and message delivery depend on Meta’s services, review processes, and policies. Meta handles information under its own terms and privacy practices.</p></section>

      <section><h2>8. AI-powered features</h2><p>Some optional features may use OpenAI to generate or assist with content. Information a user submits to those features, together with limited context needed to produce the requested result, may be sent to OpenAI. Users should review content before relying on or sending it and should avoid submitting information that is not needed for the task.</p></section>

      <section><h2>9. Service providers and disclosures</h2><p>We disclose information only as reasonably needed to operate the service, follow a user’s or business’s instructions, protect rights and safety, or comply with law. Providers may include Meta for WhatsApp features, Resend for email delivery, Twilio for supported communications services, OpenAI for optional AI features, and hosting, database, storage, monitoring, and security infrastructure providers used to run Storvex. A provider receives only the information relevant to the service it supplies and processes it under its own terms and our arrangements with it.</p><p>We may also disclose information in connection with a lawful request, to prevent harm or misuse, or as part of a business reorganisation where appropriate safeguards apply.</p></section>

      <section><h2>10. Public Marketplace information</h2><p>Information a business chooses to publish on the Storvex Marketplace—such as its store name, contact details, products, prices, descriptions, and images—is public and may be indexed by search engines or shared by others. Private operational records in a business account are not made public merely because the business uses Marketplace.</p></section>

      <section><h2>11. Retention</h2><p>We keep information for as long as reasonably needed to provide Storvex, maintain appropriate business and security records, resolve disputes, comply with applicable obligations, and follow a business’s instructions. The appropriate period depends on the type of information, why it is used, account status, legal requirements, and technical backup cycles. We delete or de-identify information when it is no longer reasonably needed, subject to these considerations.</p></section>

      <section><h2>12. Security</h2><p>We use administrative, technical, and organisational measures intended to protect information against unauthorised access, loss, alteration, or disclosure. No online service or storage method can guarantee absolute security, and users are responsible for protecting their credentials and choosing appropriate account access.</p></section>

      <section><h2>13. International processing</h2><p>Storvex and its providers may process information in countries other than the country where a user or business is located. Privacy laws may differ across those locations. Where required, we use appropriate arrangements for international processing.</p></section>

      <section><h2>14. Your choices and rights</h2><p>Depending on applicable law and our role for the relevant information, a person may ask to access, correct, delete, restrict, or object to processing of personal information, or request a portable copy. Requests may require identity verification. If the information is controlled by a business using Storvex, we may direct the requester to that business or help the business respond.</p><p>To request deletion, see our <Link href="/data-deletion">Data Deletion Instructions</Link>.</p></section>

      <section><h2>15. Changes to this policy</h2><p>We may update this policy as Storvex, our providers, or applicable requirements change. We will publish the revised policy here and update the date above. Where appropriate, we may provide an additional notice.</p></section>

      <section className="legal-contact"><h2>Contact us</h2><p>For privacy questions or requests, email <a href="mailto:support@storvex.rw">support@storvex.rw</a>.</p></section>
    </LegalPage>
  );
}
