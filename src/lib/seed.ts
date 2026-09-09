import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { Loan } from "@/models/Loan";
import { Document } from "@/models/Document";
import { Issue } from "@/models/Issue";
import { AuditEvent } from "@/models/AuditEvent";
import { VerificationCheck } from "@/models/VerificationCheck";
import { AppSettings } from "@/models/AppSettings";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEFAULT_RATES } from "./constants";
import { demoDocumentPreview } from "./document-preview";
import { evaluateApplication, persistVerification } from "./verification";
import { pipelineForStatus } from "./application-map";

type SeedDoc = {
  documentType: string;
  fileName: string;
  status: string;
  confidence?: number;
  extracted?: {
    name?: string;
    date?: string;
    income?: number;
    address?: string;
    employer?: string;
  };
  qualityOk?: boolean;
  title: string;
  subtitle?: string;
  lines?: string[];
};

type SeedApp = {
  applicationNumber: string;
  applicant: {
    fullName: string;
    dateOfBirth: string;
    phone: string;
    email: string;
    address: string;
    employmentType: string;
  };
  financial: {
    monthlyIncome: number;
    monthlyExpenses: number;
    existingEmis: number;
    requestedLoanAmount: number;
    loanTenure: number;
    employmentDurationMonths?: number;
  };
  loanType: string;
  purpose: string;
  status: string;
  priority?: "Normal" | "High";
  daysAgo: number;
  dueInDays?: number;
  assigned?: "reviewer" | "officer" | "admin";
  documents: SeedDoc[];
  decision?: {
    status: "Verified" | "Needs More Information" | "Rejected";
    reason: string;
  };
  requestedInfo?: string[];
  scenario: string;
};

const SEED_APPS: SeedApp[] = [
  {
    applicationNumber: "LF-2026-1001",
    scenario: "Fully verified",
    applicant: {
      fullName: "Priya Mehta",
      dateOfBirth: "1991-04-18",
      phone: "+1-415-555-0142",
      email: "priya.mehta@example.net",
      address: "88 Valencia Street, San Francisco, CA 94110",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 9200,
      monthlyExpenses: 3100,
      existingEmis: 450,
      requestedLoanAmount: 420000,
      loanTenure: 240,
      employmentDurationMonths: 64,
    },
    loanType: "Home",
    purpose: "Purchase of a primary residence",
    status: "Verified",
    daysAgo: 18,
    assigned: "reviewer",
    decision: {
      status: "Verified",
      reason: "Identity, documents, and financials are consistent. Verification completed.",
    },
    documents: [
      idDoc("Priya Mehta", "88 Valencia Street, San Francisco, CA 94110"),
      addressDoc("Priya Mehta", "88 Valencia Street, San Francisco, CA 94110"),
      incomeDoc("Priya Mehta", 9200, "2026-07-31"),
      bankDoc("Priya Mehta", "2026-08-12"),
      employmentDoc("Priya Mehta", "Northbay Analytics"),
    ],
  },
  {
    applicationNumber: "LF-2026-1002",
    scenario: "Missing document",
    applicant: {
      fullName: "Marcus Hale",
      dateOfBirth: "1988-11-02",
      phone: "+1-312-555-0198",
      email: "marcus.hale@example.net",
      address: "1407 W Monroe Street, Chicago, IL 60607",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 6100,
      monthlyExpenses: 2400,
      existingEmis: 280,
      requestedLoanAmount: 28000,
      loanTenure: 60,
      employmentDurationMonths: 29,
    },
    loanType: "Auto",
    purpose: "Used vehicle purchase",
    status: "More Information Requested",
    daysAgo: 6,
    assigned: "reviewer",
    requestedInfo: ["Income Proof", "Bank Statement"],
    documents: [
      idDoc("Marcus Hale", "1407 W Monroe Street, Chicago, IL 60607"),
      addressDoc("Marcus Hale", "1407 W Monroe Street, Chicago, IL 60607"),
    ],
  },
  {
    applicationNumber: "LF-2026-1003",
    scenario: "Name mismatch",
    applicant: {
      fullName: "Aisha Rahman",
      dateOfBirth: "1994-07-09",
      phone: "+1-206-555-0174",
      email: "aisha.rahman@example.net",
      address: "402 Pine Street, Seattle, WA 98101",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 5400,
      monthlyExpenses: 2100,
      existingEmis: 0,
      requestedLoanAmount: 18000,
      loanTenure: 36,
      employmentDurationMonths: 21,
    },
    loanType: "Personal",
    purpose: "Debt consolidation",
    status: "Needs Review",
    priority: "High",
    daysAgo: 4,
    assigned: "reviewer",
    documents: [
      idDoc("Aisha Rahman", "402 Pine Street, Seattle, WA 98101"),
      addressDoc("Aisha Rahman", "402 Pine Street, Seattle, WA 98101"),
      incomeDoc("Aisha Rahman", 5400, "2026-07-15"),
      bankDoc("Aisha R. Khan", "2026-08-01"),
      employmentDoc("Aisha Rahman", "Cascade Health"),
    ],
  },
  {
    applicationNumber: "LF-2026-1004",
    scenario: "Income inconsistency",
    applicant: {
      fullName: "Diego Alvarez",
      dateOfBirth: "1985-01-27",
      phone: "+1-512-555-0116",
      email: "diego.alvarez@example.net",
      address: "901 Congress Avenue, Austin, TX 78701",
      employmentType: "Self-Employed",
    },
    financial: {
      monthlyIncome: 11000,
      monthlyExpenses: 4200,
      existingEmis: 900,
      requestedLoanAmount: 360000,
      loanTenure: 180,
      employmentDurationMonths: 48,
    },
    loanType: "Home",
    purpose: "Refinance existing mortgage",
    status: "Needs Review",
    priority: "High",
    daysAgo: 5,
    assigned: "reviewer",
    documents: [
      idDoc("Diego Alvarez", "901 Congress Avenue, Austin, TX 78701"),
      addressDoc("Diego Alvarez", "901 Congress Avenue, Austin, TX 78701"),
      incomeDoc("Diego Alvarez", 7200, "2026-06-30"),
      bankDoc("Diego Alvarez", "2026-08-04"),
      employmentDoc("Diego Alvarez", "Alvarez Studio LLC"),
    ],
  },
  {
    applicationNumber: "LF-2026-1005",
    scenario: "High-risk needs review",
    applicant: {
      fullName: "Naomi Chen",
      dateOfBirth: "1996-09-14",
      phone: "+1-917-555-0133",
      email: "naomi.chen@example.net",
      address: "21-15 44th Drive, Long Island City, NY 11101",
      employmentType: "Contract",
    },
    financial: {
      monthlyIncome: 4800,
      monthlyExpenses: 3900,
      existingEmis: 1450,
      requestedLoanAmount: 260000,
      loanTenure: 84,
      employmentDurationMonths: 8,
    },
    loanType: "Personal",
    purpose: "Business startup costs",
    status: "Needs Review",
    priority: "High",
    daysAgo: 3,
    dueInDays: -1,
    assigned: "reviewer",
    documents: [
      idDoc("Naomi Chen", "21-15 44th Drive, Long Island City, NY 11101", false),
      addressDoc("Naomi Chen", "21-15 44th Drive, Long Island City, NY 11101"),
      incomeDoc("Naomi Chen", 4800, "2025-12-01"),
      bankDoc("Naomi Chen", "2025-11-20"),
    ],
  },
  {
    applicationNumber: "LF-2026-1006",
    scenario: "Recently submitted",
    applicant: {
      fullName: "Samuel Okonkwo",
      dateOfBirth: "1990-03-05",
      phone: "+1-404-555-0188",
      email: "samuel.okonkwo@example.net",
      address: "675 Ponce de Leon Avenue, Atlanta, GA 30308",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 7300,
      monthlyExpenses: 2600,
      existingEmis: 320,
      requestedLoanAmount: 34000,
      loanTenure: 48,
      employmentDurationMonths: 40,
    },
    loanType: "Auto",
    purpose: "New vehicle purchase",
    status: "Submitted",
    daysAgo: 1,
    assigned: "officer",
    documents: [
      idDoc("Samuel Okonkwo", "675 Ponce de Leon Avenue, Atlanta, GA 30308"),
      addressDoc("Samuel Okonkwo", "675 Ponce de Leon Avenue, Atlanta, GA 30308"),
      incomeDoc("Samuel Okonkwo", 7300, "2026-08-20"),
    ],
  },
  {
    applicationNumber: "LF-2026-1007",
    scenario: "Pending verification",
    applicant: {
      fullName: "Elena Voss",
      dateOfBirth: "1987-12-22",
      phone: "+1-303-555-0160",
      email: "elena.voss@example.net",
      address: "1550 Wewatta Street, Denver, CO 80202",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 8800,
      monthlyExpenses: 3000,
      existingEmis: 510,
      requestedLoanAmount: 510000,
      loanTenure: 300,
      employmentDurationMonths: 72,
    },
    loanType: "Home",
    purpose: "Primary home purchase",
    status: "Verification Pending",
    daysAgo: 2,
    assigned: "reviewer",
    documents: [
      idDoc("Elena Voss", "1550 Wewatta Street, Denver, CO 80202"),
      addressDoc("Elena Voss", "1550 Wewatta Street, Denver, CO 80202"),
      incomeDoc("Elena Voss", 8800, "2026-08-01"),
      bankDoc("Elena Voss", "2026-08-10"),
      employmentDoc("Elena Voss", "Summit Credit Ops"),
    ],
  },
  {
    applicationNumber: "LF-2026-1008",
    scenario: "Rejected verification",
    applicant: {
      fullName: "Rohan Iyer",
      dateOfBirth: "1993-06-11",
      phone: "+1-480-555-0129",
      email: "rohan.iyer@example.net",
      address: "2201 E Camelback Road, Phoenix, AZ 85016",
      employmentType: "Self-Employed",
    },
    financial: {
      monthlyIncome: 3900,
      monthlyExpenses: 3400,
      existingEmis: 1200,
      requestedLoanAmount: 240000,
      loanTenure: 60,
      employmentDurationMonths: 6,
    },
    loanType: "Personal",
    purpose: "Unsecured personal expenses",
    status: "Rejected",
    priority: "High",
    daysAgo: 12,
    assigned: "admin",
    decision: {
      status: "Rejected",
      reason: "Multiple high-severity inconsistencies and an unsustainable income multiple.",
    },
    documents: [
      idDoc("Rohan Iyer", "2201 E Camelback Road, Phoenix, AZ 85016"),
      incomeDoc("R. Iyer", 2100, "2025-08-01"),
    ],
  },
  {
    applicationNumber: "LF-2026-1009",
    scenario: "More information requested",
    applicant: {
      fullName: "Camille Dubois",
      dateOfBirth: "1992-02-28",
      phone: "+1-504-555-0155",
      email: "camille.dubois@example.net",
      address: "800 Magazine Street, New Orleans, LA 70130",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 6700,
      monthlyExpenses: 2500,
      existingEmis: 200,
      requestedLoanAmount: 26000,
      loanTenure: 48,
      employmentDurationMonths: 33,
    },
    loanType: "Auto",
    purpose: "Vehicle refinance",
    status: "More Information Requested",
    daysAgo: 8,
    assigned: "reviewer",
    requestedInfo: ["Employment Proof", "Updated bank statement"],
    documents: [
      idDoc("Camille Dubois", "800 Magazine Street, New Orleans, LA 70130"),
      addressDoc("Camille Dubois", "800 Magazine Street, New Orleans, LA 70130"),
      incomeDoc("Camille Dubois", 6700, "2026-05-01"),
      bankDoc("Camille Dubois", "2025-10-12"),
    ],
  },
  {
    applicationNumber: "LF-2026-1010",
    scenario: "Draft",
    applicant: {
      fullName: "Jordan Blake",
      dateOfBirth: "1998-08-03",
      phone: "+1-615-555-0104",
      email: "jordan.blake@example.net",
      address: "1200 Broadway, Nashville, TN 37203",
      employmentType: "Contract",
    },
    financial: {
      monthlyIncome: 5100,
      monthlyExpenses: 1900,
      existingEmis: 0,
      requestedLoanAmount: 12000,
      loanTenure: 24,
    },
    loanType: "Personal",
    purpose: "Relocation expenses",
    status: "Draft",
    daysAgo: 0,
    assigned: "officer",
    documents: [],
  },
  {
    applicationNumber: "LF-2026-1011",
    scenario: "Verified second case",
    applicant: {
      fullName: "Fatima Al-Hassan",
      dateOfBirth: "1984-05-19",
      phone: "+1-713-555-0190",
      email: "fatima.alhassan@example.net",
      address: "609 Main Street, Houston, TX 77002",
      employmentType: "Salaried",
    },
    financial: {
      monthlyIncome: 10400,
      monthlyExpenses: 3600,
      existingEmis: 600,
      requestedLoanAmount: 275000,
      loanTenure: 180,
      employmentDurationMonths: 96,
    },
    loanType: "Home",
    purpose: "Home improvement and energy retrofit",
    status: "Verified",
    daysAgo: 21,
    assigned: "admin",
    decision: {
      status: "Verified",
      reason: "Complete file with consistent identity and income evidence.",
    },
    documents: [
      idDoc("Fatima Al-Hassan", "609 Main Street, Houston, TX 77002"),
      addressDoc("Fatima Al-Hassan", "609 Main Street, Houston, TX 77002"),
      incomeDoc("Fatima Al-Hassan", 10400, "2026-07-28"),
      bankDoc("Fatima Al-Hassan", "2026-08-08"),
      employmentDoc("Fatima Al-Hassan", "Gulfstream Energy"),
    ],
  },
  {
    applicationNumber: "LF-2026-1012",
    scenario: "Documents processing",
    applicant: {
      fullName: "Theo Nakamura",
      dateOfBirth: "1989-10-30",
      phone: "+1-503-555-0177",
      email: "theo.nakamura@example.net",
      address: "1120 NW Couch Street, Portland, OR 97209",
      employmentType: "Business Owner",
    },
    financial: {
      monthlyIncome: 7800,
      monthlyExpenses: 2900,
      existingEmis: 400,
      requestedLoanAmount: 85000,
      loanTenure: 60,
      employmentDurationMonths: 54,
    },
    loanType: "Business",
    purpose: "Working capital for inventory",
    status: "Verification Pending",
    daysAgo: 2,
    assigned: "reviewer",
    documents: [
      idDoc("Theo Nakamura", "1120 NW Couch Street, Portland, OR 97209"),
      addressDoc("Theo Nakamura", "1120 NW Couch Street, Portland, OR 97209"),
      {
        ...incomeDoc("Theo Nakamura", 7800, "2026-08-18"),
        status: "Processing",
        confidence: 61,
      },
      {
        ...bankDoc("Theo Nakamura", "2026-08-18"),
        status: "Needs Review",
        confidence: 73,
      },
    ],
  },
];

function idDoc(name: string, address: string, qualityOk = true): SeedDoc {
  return {
    documentType: "Identity Proof",
    fileName: `${name.replace(/\s+/g, "-").toLowerCase()}-id.svg`,
    status: qualityOk ? "Verified" : "Needs Review",
    confidence: qualityOk ? 94 : 68,
    qualityOk,
    extracted: { name, address, date: "2024-03-12" },
    title: "Identity Proof",
    subtitle: "Simulated national ID extract",
    lines: [`Name: ${name}`, `Address: ${address}`, "Document no: LF-ID-44821"],
  };
}

function addressDoc(name: string, address: string): SeedDoc {
  return {
    documentType: "Address Proof",
    fileName: `${name.replace(/\s+/g, "-").toLowerCase()}-address.svg`,
    status: "Verified",
    confidence: 91,
    extracted: { name, address, date: "2026-06-01" },
    title: "Address Proof",
    subtitle: "Simulated utility statement",
    lines: [`Account holder: ${name}`, `Service address: ${address}`],
  };
}

function incomeDoc(name: string, income: number, date: string): SeedDoc {
  return {
    documentType: "Income Proof",
    fileName: `${name.replace(/\s+/g, "-").toLowerCase()}-income.svg`,
    status: "Verified",
    confidence: 88,
    extracted: { name, income, date },
    title: "Income Proof",
    subtitle: "Simulated payslip / income statement",
    lines: [`Payee: ${name}`, `Monthly income: $${income.toLocaleString()}`, `Period ending: ${date}`],
  };
}

function bankDoc(name: string, date: string): SeedDoc {
  return {
    documentType: "Bank Statement",
    fileName: `${name.replace(/\s+/g, "-").toLowerCase()}-bank.svg`,
    status: "Verified",
    confidence: 86,
    extracted: { name, date },
    title: "Bank Statement",
    subtitle: "Simulated 30-day statement header",
    lines: [`Account name: ${name}`, `Statement date: ${date}`],
  };
}

function employmentDoc(name: string, employer: string): SeedDoc {
  return {
    documentType: "Employment Proof",
    fileName: `${name.replace(/\s+/g, "-").toLowerCase()}-employment.svg`,
    status: "Verified",
    confidence: 90,
    extracted: { name, employer, date: "2026-07-01" },
    title: "Employment Proof",
    subtitle: "Simulated employer letter",
    lines: [`Employee: ${name}`, `Employer: ${employer}`],
  };
}

async function ensureDemoUsers() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: Record<string, { _id: string; name: string; email: string; role: string }> = {};

  for (const account of DEMO_ACCOUNTS) {
    const user = await User.findOneAndUpdate(
      { email: account.email },
      {
        $setOnInsert: {
          name: account.name,
          email: account.email,
          password,
          role: account.role,
          isDemo: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    users[account.role === "customer" ? "officer" : account.role === "staff" ? "reviewer" : "admin"] = {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  return users;
}

export async function seedDemoData(options?: { force?: boolean }) {
  const users = await ensureDemoUsers();
  await AppSettings.findOneAndUpdate(
    { key: "default" },
    { key: "default", rates: DEFAULT_RATES, verificationWindowDays: 90 },
    { upsert: true }
  );

  if (options?.force) {
    const demoLoans = await Loan.find({ isDemo: true }).select("_id");
    const ids = demoLoans.map((loan) => loan._id);
    await Promise.all([
      Loan.deleteMany({ isDemo: true }),
      Document.deleteMany({ loan: { $in: ids } }),
      Issue.deleteMany({ loan: { $in: ids } }),
      VerificationCheck.deleteMany({ loan: { $in: ids } }),
      AuditEvent.deleteMany({ loan: { $in: ids } }),
    ]);
  }

  for (const item of SEED_APPS) {
    const existingApp = await Loan.findOne({ applicationNumber: item.applicationNumber });
    if (existingApp && !options?.force) {
      try {
        const checkCount = await VerificationCheck.countDocuments({ loan: existingApp._id });
        if (checkCount === 0) {
          const docs = await Document.find({ loan: existingApp._id }).lean();
          const evaluation = evaluateApplication(existingApp.toObject(), docs as Record<string, unknown>[]);
          await persistVerification(String(existingApp._id), evaluation, {
            replaceIssues: true,
            assignedTo: users.reviewer._id,
            isDemo: true,
          });
          await Loan.findByIdAndUpdate(existingApp._id, {
            verificationScore: evaluation.score,
            riskLevel: evaluation.riskLevel,
          });
        }
      } catch (error) {
        console.error("[LendFlow] Failed to backfill", item.applicationNumber, error);
      }
      continue;
    }

    const officer = users.officer;
    const assignee =
      item.assigned === "admin"
        ? users.admin
        : item.assigned === "officer"
          ? users.officer
          : users.reviewer;
    const createdAt = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);
    const submittedAt = item.status === "Draft" ? undefined : createdAt;
    const dueAt = new Date(createdAt.getTime() + (item.dueInDays ?? 5) * 24 * 60 * 60 * 1000);

    const loan = await Loan.create({
      user: officer._id,
      applicationNumber: item.applicationNumber,
      loanType: item.loanType,
      purpose: item.purpose,
      principalAmount: item.financial.requestedLoanAmount,
      interestRate: DEFAULT_RATES[item.loanType] ?? 12.5,
      tenureMonths: item.financial.loanTenure,
      status: item.status,
      pipelineStage: pipelineForStatus(item.status),
      priority: item.priority || "Normal",
      isDemo: true,
      applicant: item.applicant,
      financial: item.financial,
      applicantDetails: {
        income: item.financial.monthlyIncome,
        employmentStatus: item.applicant.employmentType,
        creditScore: 700,
      },
      annualIncome: item.financial.monthlyIncome * 12,
      employmentLengthMonths: item.financial.employmentDurationMonths,
      debtToIncomeRatio:
        item.financial.monthlyIncome > 0
          ? (item.financial.monthlyExpenses + item.financial.existingEmis) /
            item.financial.monthlyIncome
          : 0,
      assignedTo: assignee._id,
      requestedInfo: item.requestedInfo || [],
      submittedAt,
      dueAt: item.status === "Draft" ? undefined : dueAt,
      decision: item.decision
        ? {
            ...item.decision,
            reviewerId: users.reviewer._id,
            reviewerName: users.reviewer.name,
            timestamp: createdAt,
          }
        : undefined,
      createdAt,
      updatedAt: createdAt,
    });

    const createdDocs = [];
    try {
    for (const doc of item.documents) {
      createdDocs.push(
        await Document.create({
          loan: loan._id,
          user: officer._id,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileUrl: demoDocumentPreview({
            title: doc.title,
            name: item.applicant.fullName,
            subtitle: doc.subtitle,
            lines: doc.lines,
          }),
          mimeType: "image/svg+xml",
          status: doc.status,
          confidence: doc.confidence,
          extracted: doc.extracted,
          qualityOk: doc.qualityOk !== false,
          isDemo: true,
          reviewer: users.reviewer._id,
          uploadedAt: createdAt,
        })
      );
    }

    const evaluation = evaluateApplication(loan.toObject(), createdDocs.map((doc) => doc.toObject()));
    await persistVerification(String(loan._id), evaluation, {
      replaceIssues: true,
      assignedTo: users.reviewer._id,
      isDemo: true,
    });

    await Loan.findByIdAndUpdate(loan._id, {
      verificationScore: evaluation.score,
      riskLevel: evaluation.riskLevel,
    });

    await AuditEvent.insertMany([
      {
        loan: loan._id,
        actorId: officer._id,
        actorName: officer.name,
        action: "Application created",
        details: `${item.applicationNumber} opened for ${item.applicant.fullName}.`,
        isDemo: true,
        createdAt,
      },
      item.status !== "Draft"
        ? {
            loan: loan._id,
            actorId: officer._id,
            actorName: officer.name,
            action: "Application submitted",
            details: `Scenario: ${item.scenario}.`,
            isDemo: true,
            createdAt,
          }
        : null,
      item.documents.length
        ? {
            loan: loan._id,
            actorId: officer._id,
            actorName: officer.name,
            action: "Documents uploaded",
            details: `${item.documents.length} document(s) attached.`,
            isDemo: true,
            createdAt,
          }
        : null,
      {
        loan: loan._id,
        actorId: users.reviewer._id,
        actorName: users.reviewer.name,
        action: "Verification started",
        details: "Rules-based demo verification ran against the file.",
        isDemo: true,
        createdAt,
      },
      item.decision
        ? {
            loan: loan._id,
            actorId: users.reviewer._id,
            actorName: users.reviewer.name,
            action: "Decision recorded",
            details: item.decision.reason,
            isDemo: true,
            createdAt,
          }
        : null,
    ].filter(Boolean));
    } catch (error) {
      console.error("[LendFlow] Failed to seed", item.applicationNumber, error);
    }
  }

  return { seeded: true, users, applications: SEED_APPS.length };
}

export async function ensureDemoReady() {
  const users = await ensureDemoUsers();
  const count = await Loan.countDocuments({ isDemo: true });
  if (count < 8) {
    await seedDemoData({ force: false });
  }
  return users;
}
