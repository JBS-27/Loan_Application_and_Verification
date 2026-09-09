import { AuditEvent } from "@/models/AuditEvent";

export async function recordAudit(input: {
  loan?: string;
  actorId?: string;
  actorName: string;
  action: string;
  details?: string;
  isDemo?: boolean;
}) {
  await AuditEvent.create({
    loan: input.loan,
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    details: input.details || "",
    isDemo: input.isDemo || false,
  });
}
