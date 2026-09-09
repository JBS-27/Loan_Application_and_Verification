import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Document } from "@/models/Document";
import { Loan } from "@/models/Loan";
import { recordAudit } from "@/lib/audit";
import { mapDocument } from "@/lib/application-map";
import { runVerificationForLoan } from "@/lib/application-service";
import { DOCUMENT_TYPES } from "@/lib/constants";

const MAX_BYTES = 1_500_000;

export async function GET(req: Request) {
  try {
    await requireSession();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const loanId = searchParams.get("loanId");
    const query = loanId ? { loan: loanId } : {};
    const documents = await Document.find(query)
      .populate("reviewer", "name")
      .sort({ uploadedAt: -1 })
      .lean();
    return NextResponse.json({
      documents: documents.map((doc) => mapDocument(doc as Record<string, unknown>)),
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load documents.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const body = await req.json();
    const loanId = body.loanId || body.loan;
    const documentType = (DOCUMENT_TYPES as readonly string[]).includes(body.documentType)
      ? body.documentType
      : body.documentType === "KYC"
        ? "Identity Proof"
        : "Income Proof";

    if (!loanId) {
      return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    }

    const fileUrl = String(body.fileUrl || "");
    if (!fileUrl) {
      return NextResponse.json({ error: "Upload a file or provide a document preview." }, { status: 400 });
    }
    if (fileUrl.length > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large for this demo (1.5 MB limit)." }, { status: 400 });
    }

    await connectDB();
    const loan = await Loan.findById(loanId);
    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const existing = await Document.findOne({ loan: loanId, documentType });
    const payload = {
      loan: loanId,
      user: user._id,
      documentType,
      fileName: String(body.fileName || `${documentType}.file`),
      fileUrl,
      mimeType: String(body.mimeType || "application/octet-stream"),
      status: "Uploaded",
      confidence: 72,
      extracted: body.extracted || { name: loan.applicant?.fullName },
      qualityOk: true,
      uploadedAt: new Date(),
    };

    const document = existing
      ? await Document.findByIdAndUpdate(existing._id, payload, { new: true })
      : await Document.create(payload);

    await recordAudit({
      loan: String(loanId),
      actorId: user._id,
      actorName: user.name,
      action: "Document uploaded",
      details: `${documentType} (${payload.fileName})`,
    });

    if (loan.status !== "Draft") {
      await runVerificationForLoan(String(loan._id), user);
    }

    return NextResponse.json({ document: mapDocument(document.toObject()) }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to upload the document.");
    return NextResponse.json({ error: message }, { status });
  }
}
