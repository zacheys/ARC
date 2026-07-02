import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

// --- inline helpers (kept dependency-free so the seed runs standalone) ---

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const now = new Date();
/** N days ago from now. */
const ago = (n: number) => addDays(now, -n);

function ref(slug: string, seq: number): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
  return `${prefix}-${now.getFullYear()}-${String(seq).padStart(4, "0")}`;
}

const SEED_PASSWORD = process.env.SEED_COMMITTEE_PASSWORD || "committee123";

async function main() {
  console.log("Seeding ARCTrack…");

  // Clear existing data (idempotent reseed)
  await prisma.activity.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.hoa.deleteMany();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const oakRidge = await prisma.hoa.create({
    data: {
      slug: "oak-ridge",
      name: "Oak Ridge Homeowners Association",
      committeeEmails: ["arc@oakridge.example.com"],
      committeePasswordHash: passwordHash,
      reviewDeadlineDays: 30,
    },
  });

  const lakeside = await prisma.hoa.create({
    data: {
      slug: "lakeside",
      name: "Lakeside Community Association",
      committeeEmails: ["committee@lakeside.example.com"],
      committeePasswordHash: passwordHash,
      reviewDeadlineDays: 45,
    },
  });

  type SeedRequest = {
    seq: number;
    homeownerName: string;
    homeownerEmail: string;
    homeownerPhone?: string;
    propertyAddress: string;
    requestType:
      | "FENCE"
      | "PAINT"
      | "ROOF"
      | "ADDITION"
      | "LANDSCAPING"
      | "SOLAR"
      | "OTHER";
    description: string;
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "DENIED"
      | "APPEAL_REQUESTED"
      | "HEARING_SCHEDULED"
      | "APPEAL_RESOLVED";
    submittedDaysAgo: number;
    // denial
    denialDaysAgo?: number;
    denialReasons?: string;
    denialRequiredChanges?: string;
    denialDeliveryMethod?: "CERTIFIED_MAIL" | "HAND_DELIVERY" | "ELECTRONIC";
    // appeal
    appealDaysAgo?: number;
    hearingScheduledInDays?: number;
    appealResolution?: string;
  };

  async function createRequest(
    hoaId: string,
    slug: string,
    reviewDeadlineDays: number,
    r: SeedRequest
  ) {
    const submittedAt = ago(r.submittedDaysAgo);
    const reviewDeadlineAt = addDays(submittedAt, reviewDeadlineDays);

    const data: Record<string, unknown> = {
      hoaId,
      referenceNumber: ref(slug, r.seq),
      homeownerName: r.homeownerName,
      homeownerEmail: r.homeownerEmail,
      homeownerPhone: r.homeownerPhone ?? null,
      propertyAddress: r.propertyAddress,
      requestType: r.requestType,
      description: r.description,
      status: r.status,
      submittedAt,
      reviewDeadlineAt,
    };

    if (r.denialDaysAgo !== undefined) {
      const denialNoticeDate = ago(r.denialDaysAgo);
      data.decisionAt = denialNoticeDate;
      data.denialReasons = r.denialReasons;
      data.denialRequiredChanges = r.denialRequiredChanges;
      data.denialNoticeDate = denialNoticeDate;
      data.denialDeliveryMethod = r.denialDeliveryMethod;
      data.appealRequestWindowAt = addDays(denialNoticeDate, 30);
    }

    if (r.appealDaysAgo !== undefined) {
      const appealRequestedAt = ago(r.appealDaysAgo);
      data.appealRequestedAt = appealRequestedAt;
      data.hearingDeadlineAt = addDays(appealRequestedAt, 30);
      if (r.hearingScheduledInDays !== undefined) {
        data.hearingScheduledAt = addDays(now, r.hearingScheduledInDays);
      }
    }

    if (r.status === "APPROVED") {
      data.decisionAt = addDays(submittedAt, Math.floor(reviewDeadlineDays / 2));
    }

    if (r.status === "APPEAL_RESOLVED") {
      data.appealResolvedAt = ago(1);
      data.appealResolution = r.appealResolution;
    }

    const created = await prisma.request.create({ data: data as never });

    // Minimal activity trail
    await prisma.activity.create({
      data: {
        requestId: created.id,
        type: "SUBMITTED",
        message: `Request submitted by ${r.homeownerName}.`,
        actor: "homeowner",
        createdAt: submittedAt,
      },
    });
    if (r.denialDaysAgo !== undefined) {
      await prisma.activity.create({
        data: {
          requestId: created.id,
          type: "DENIAL_ISSUED",
          message: `Request DENIED. Notice delivered via ${r.denialDeliveryMethod}.`,
          actor: "committee",
          createdAt: ago(r.denialDaysAgo),
        },
      });
    }
    if (r.appealDaysAgo !== undefined) {
      await prisma.activity.create({
        data: {
          requestId: created.id,
          type: "APPEAL_REQUESTED",
          message: "Homeowner requested a board hearing.",
          actor: "committee",
          createdAt: ago(r.appealDaysAgo),
        },
      });
    }
    return created;
  }

  const oakRequests: SeedRequest[] = [
    {
      seq: 1,
      homeownerName: "Maria Gonzalez",
      homeownerEmail: "maria.g@example.com",
      homeownerPhone: "512-555-0142",
      propertyAddress: "104 Oak Bend Trail, Round Rock, TX 78664",
      requestType: "FENCE",
      description:
        "Requesting to replace the existing wood privacy fence with a 6-foot cedar fence along the rear property line. Same height and setback as current.",
      status: "PENDING",
      submittedDaysAgo: 2, // review due ~28 days -> GREEN
    },
    {
      seq: 2,
      homeownerName: "James Whitfield",
      homeownerEmail: "jwhitfield@example.com",
      propertyAddress: "212 Silver Maple Dr, Round Rock, TX 78664",
      requestType: "PAINT",
      description:
        "Repaint exterior body from beige to 'Sea Salt' (Sherwin-Williams SW 6204) with white trim. Color samples attached.",
      status: "UNDER_REVIEW",
      submittedDaysAgo: 20, // review due ~10 days -> YELLOW
    },
    {
      seq: 3,
      homeownerName: "Priya Nair",
      homeownerEmail: "priya.nair@example.com",
      homeownerPhone: "512-555-0177",
      propertyAddress: "77 Redbud Lane, Round Rock, TX 78665",
      requestType: "SOLAR",
      description:
        "Install 18 roof-mounted solar panels on the south-facing rear roof plane. Flush-mounted, black frames.",
      status: "UNDER_REVIEW",
      submittedDaysAgo: 27, // review due ~3 days -> RED
    },
    {
      seq: 4,
      homeownerName: "Robert Chen",
      homeownerEmail: "rchen@example.com",
      propertyAddress: "9 Cypress Court, Round Rock, TX 78664",
      requestType: "ADDITION",
      description:
        "Add a 12x16 covered patio with a standing-seam metal roof off the back of the house.",
      status: "PENDING",
      submittedDaysAgo: 34, // review OVERDUE by ~4 days -> RED/overdue
    },
    {
      seq: 5,
      homeownerName: "Linda Okafor",
      homeownerEmail: "lokafor@example.com",
      propertyAddress: "480 Willow Springs Blvd, Round Rock, TX 78665",
      requestType: "ROOF",
      description:
        "Replace asphalt shingles with a dark bronze metal roof. Requesting due to storm damage.",
      status: "DENIED",
      submittedDaysAgo: 33,
      denialDaysAgo: 27, // appeal window closes in ~3 days -> RED
      denialReasons:
        "Metal roofing is not an approved material under Article 5.3 of the CC&Rs, which limit roofing to architectural-grade composition shingles in earth-tone colors.",
      denialRequiredChanges:
        "Resubmit with a composition shingle product in an approved earth-tone color (see approved materials list). A metal roof may be reconsidered only with a variance approved by the Board.",
      denialDeliveryMethod: "CERTIFIED_MAIL",
    },
    {
      seq: 6,
      homeownerName: "David Feldman",
      homeownerEmail: "dfeldman@example.com",
      homeownerPhone: "512-555-0190",
      propertyAddress: "31 Hollow Creek Dr, Round Rock, TX 78664",
      requestType: "LANDSCAPING",
      description:
        "Remove front-yard turf and install xeriscape with decomposed granite paths and native beds.",
      status: "APPEAL_REQUESTED",
      submittedDaysAgo: 60,
      denialDaysAgo: 40,
      denialReasons:
        "Proposed decomposed-granite ground cover exceeds the 40% non-living-material limit for front yards under the landscaping guidelines.",
      denialRequiredChanges:
        "Reduce hardscape/DG coverage to 40% or less of the front-yard area and increase native planting density accordingly.",
      denialDeliveryMethod: "ELECTRONIC",
      appealDaysAgo: 25, // hearing deadline in ~5 days -> RED
    },
    {
      seq: 7,
      homeownerName: "Sandra Brooks",
      homeownerEmail: "sbrooks@example.com",
      propertyAddress: "150 Meadow Vale, Round Rock, TX 78665",
      requestType: "PAINT",
      description: "Repaint front door 'Naval' blue. Trim unchanged.",
      status: "APPROVED",
      submittedDaysAgo: 50, // closed -> archive
    },
    {
      seq: 8,
      homeownerName: "Thomas Reyes",
      homeownerEmail: "treyes@example.com",
      propertyAddress: "88 Ridgeview Pass, Round Rock, TX 78664",
      requestType: "FENCE",
      description:
        "Requested wrought-iron fence in front yard. Appealed after initial denial.",
      status: "APPEAL_RESOLVED",
      submittedDaysAgo: 120,
      denialDaysAgo: 100,
      denialReasons:
        "Front-yard fencing is prohibited under Article 5.7 except for approved decorative low fencing under 3 feet.",
      denialRequiredChanges:
        "Limit any front-yard fence to an approved decorative style not exceeding 36 inches in height.",
      denialDeliveryMethod: "HAND_DELIVERY",
      appealDaysAgo: 85,
      hearingScheduledInDays: -70,
      appealResolution:
        "Board upheld the denial. Homeowner elected to install an approved 36-inch decorative fence instead.",
    },
  ];

  for (const r of oakRequests) {
    await createRequest(oakRidge.id, oakRidge.slug, oakRidge.reviewDeadlineDays, r);
  }
  await prisma.hoa.update({
    where: { id: oakRidge.id },
    data: { referenceSeq: oakRequests.length },
  });

  const lakeRequests: SeedRequest[] = [
    {
      seq: 1,
      homeownerName: "Emily Park",
      homeownerEmail: "epark@example.com",
      propertyAddress: "5 Harbor View Ln, Georgetown, TX 78628",
      requestType: "ADDITION",
      description: "Build a detached 200 sqft garden studio in the back yard.",
      status: "UNDER_REVIEW",
      submittedDaysAgo: 35, // 45-day HOA -> ~10 days -> YELLOW
    },
    {
      seq: 2,
      homeownerName: "Marcus Bell",
      homeownerEmail: "mbell@example.com",
      propertyAddress: "27 Marina Point, Georgetown, TX 78628",
      requestType: "SOLAR",
      description: "Ground-mounted solar array in rear yard, screened by hedge.",
      status: "PENDING",
      submittedDaysAgo: 3, // GREEN
    },
  ];

  for (const r of lakeRequests) {
    await createRequest(lakeside.id, lakeside.slug, lakeside.reviewDeadlineDays, r);
  }
  await prisma.hoa.update({
    where: { id: lakeside.id },
    data: { referenceSeq: lakeRequests.length },
  });

  console.log(
    `Seeded ${oakRequests.length + lakeRequests.length} requests across 2 associations.`
  );
  console.log("\nDashboards (committee password below):");
  console.log("  Oak Ridge : /dashboard/oak-ridge");
  console.log("  Lakeside  : /dashboard/lakeside");
  console.log(`  Password  : ${SEED_PASSWORD}`);
  console.log("\nPublic forms:");
  console.log("  /submit/oak-ridge");
  console.log("  /submit/lakeside");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
