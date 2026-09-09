import { PageHeader } from "@/components/common/PageHeader";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="How LendFlow works"
        description="A short walkthrough for first-time reviewers and loan officers."
      />
      <div className="space-y-4">
        {[
          ["What problem does this solve?", "Loan files contain many fields, documents, and manual checks. LendFlow keeps that work in one operational workspace."],
          ["What does a reviewer do?", "Open the verification queue, inspect documents, jump from failed checks to the relevant section, resolve issues, then record a verification decision."],
          ["What is simulated?", "Document OCR, identity matching, income extraction, and any optional ML score are demo checks. They are labelled as such and are not bureau or government verification."],
          ["What is a verification decision?", "Verified, Needs more information, or Rejected refers to the completeness and consistency of the file — not a loan approval or sanction."],
          ["Demo accounts", "Use officer@lendflow.demo, reviewer@lendflow.demo, or admin@lendflow.demo with password LendFlow!demo."],
        ].map(([title, body]) => (
          <section key={title} className="surface-card p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
