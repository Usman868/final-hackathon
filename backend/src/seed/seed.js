/**
 * MaintainIQ – Demo Seed Script
 * Creates: Users, 22+ Assets, 18+ Issues, Maintenance schedules,
 * Notifications, Audit logs, History, Maintenance logs
 *
 * Usage: npm run seed
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import config from "../config/index.js";
import User from "../models/User.model.js";
import Asset from "../models/Asset.model.js";
import Issue from "../models/Issue.model.js";
import AssetHistory from "../models/AssetHistory.model.js";
import MaintenanceLog from "../models/MaintenanceLog.model.js";
import Notification from "../models/Notification.model.js";
import MaintenanceSchedule, {
  MAINTENANCE_STATUS,
  MAINTENANCE_FREQUENCY,
} from "../models/MaintenanceSchedule.model.js";
import AuditLog from "../models/AuditLog.model.js";
import { generateAssetQRDataURL } from "../helpers/qr.helper.js";
import {
  ROLES,
  ASSET_STATUS,
  ASSET_CONDITION,
  ISSUE_STATUS,
  PRIORITY,
  HISTORY_ACTIONS,
  SLA_HOURS_BY_PRIORITY,
} from "../constants/index.js";

const DEMO_PASSWORD = "Demo@12345";

const usersData = [
  {
    name: "Admin User",
    email: "admin@maintainiq.demo",
    password: DEMO_PASSWORD,
    role: ROLES.ADMIN,
    phone: "+92-300-1000001",
  },
  {
    name: "Sara Supervisor",
    email: "supervisor@maintainiq.demo",
    password: DEMO_PASSWORD,
    role: ROLES.SUPERVISOR,
    phone: "+92-300-1000002",
  },
  {
    name: "Ali Technician",
    email: "tech1@maintainiq.demo",
    password: DEMO_PASSWORD,
    role: ROLES.TECHNICIAN,
    phone: "+92-300-2000001",
    skills: ["HVAC", "Electrical", "Plumbing"],
  },
  {
    name: "Fatima Technician",
    email: "tech2@maintainiq.demo",
    password: DEMO_PASSWORD,
    role: ROLES.TECHNICIAN,
    phone: "+92-300-2000002",
    skills: ["IT Equipment", "Electronics", "Connectivity"],
  },
  {
    name: "Hassan Technician",
    email: "tech3@maintainiq.demo",
    password: DEMO_PASSWORD,
    role: ROLES.TECHNICIAN,
    phone: "+92-300-2000003",
    skills: ["Mechanical", "Kitchen", "Furniture"],
  },
];

const assetsData = [
  {
    name: "Classroom Projector 01",
    category: "Electronics",
    location: "Building A – Room 101",
    model: "Epson EB-X51",
    manufacturer: "Epson",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Classroom Projector 02",
    category: "Electronics",
    location: "Building A – Room 102",
    model: "BenQ MW632ST",
    manufacturer: "BenQ",
    condition: ASSET_CONDITION.FAIR,
    status: ASSET_STATUS.ISSUE_REPORTED,
  },
  {
    name: "Main AC Unit – Lobby",
    category: "HVAC",
    location: "Main Lobby",
    model: "Daikin FTXM35",
    manufacturer: "Daikin",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "AC Unit – Server Room",
    category: "HVAC",
    location: "Server Room B1",
    model: "Mitsubishi MSZ-AP",
    manufacturer: "Mitsubishi",
    condition: ASSET_CONDITION.EXCELLENT,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Water Cooler – Floor 2",
    category: "Plumbing",
    location: "Building B – Floor 2 Corridor",
    model: "Voltas 20L",
    manufacturer: "Voltas",
    condition: ASSET_CONDITION.POOR,
    status: ASSET_STATUS.UNDER_MAINTENANCE,
  },
  {
    name: "Fire Extinguisher – Wing C",
    category: "Safety",
    location: "Building C – Near Exit 3",
    model: "ABC 6kg",
    manufacturer: "Ceasefire",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Lab Microscope 03",
    category: "Laboratory",
    location: "Science Lab 2",
    model: "Olympus CX23",
    manufacturer: "Olympus",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Network Switch – Core",
    category: "IT Equipment",
    location: "Server Room B1",
    model: "Cisco Catalyst 2960",
    manufacturer: "Cisco",
    condition: ASSET_CONDITION.EXCELLENT,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Printer – Admin Office",
    category: "IT Equipment",
    location: "Admin Block – Office 1",
    model: "HP LaserJet Pro M404",
    manufacturer: "HP",
    condition: ASSET_CONDITION.FAIR,
    status: ASSET_STATUS.ISSUE_REPORTED,
  },
  {
    name: "Conference Room Display",
    category: "Electronics",
    location: "Conference Room A",
    model: "Samsung QM55R",
    manufacturer: "Samsung",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Emergency Exit Light 12",
    category: "Safety",
    location: "Building A – Stairwell 2",
    model: "LED Exit Sign",
    manufacturer: "Syska",
    condition: ASSET_CONDITION.FAIR,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Kitchen Refrigerator",
    category: "Kitchen",
    location: "Staff Cafeteria",
    model: "LG 360L Double Door",
    manufacturer: "LG",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Generator – Backup",
    category: "Electrical",
    location: "Utility Yard",
    model: "Cummins 50kVA",
    manufacturer: "Cummins",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "CCTV Camera – Gate",
    category: "Safety",
    location: "Main Gate",
    model: "Hikvision DS-2CD",
    manufacturer: "Hikvision",
    condition: ASSET_CONDITION.EXCELLENT,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Desktop PC – Lab 05",
    category: "IT Equipment",
    location: "Computer Lab 1 – Seat 05",
    model: "Dell OptiPlex 7090",
    manufacturer: "Dell",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.UNDER_INSPECTION,
  },
  {
    name: "UPS – Server Rack",
    category: "Electrical",
    location: "Server Room B1",
    model: "APC Smart-UPS 3000",
    manufacturer: "APC",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Whiteboard Interactive 01",
    category: "Electronics",
    location: "Building A – Room 201",
    model: "Promethean ActivPanel",
    manufacturer: "Promethean",
    condition: ASSET_CONDITION.FAIR,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Water Pump – Basement",
    category: "Plumbing",
    location: "Basement Pump Room",
    model: "Grundfos CR 10",
    manufacturer: "Grundfos",
    condition: ASSET_CONDITION.POOR,
    status: ASSET_STATUS.OUT_OF_SERVICE,
  },
  {
    name: "Office Chair Set – Wing B",
    category: "Furniture",
    location: "Building B – Open Office",
    model: "Ergonomic Mesh",
    manufacturer: "Local",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Air Curtain – Entrance",
    category: "HVAC",
    location: "Main Entrance",
    model: "VTS Wing",
    manufacturer: "VTS",
    condition: ASSET_CONDITION.GOOD,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Medical Fridge – Clinic",
    category: "Medical",
    location: "Campus Clinic",
    model: "B Medical Systems",
    manufacturer: "B Medical",
    condition: ASSET_CONDITION.EXCELLENT,
    status: ASSET_STATUS.OPERATIONAL,
  },
  {
    name: "Old Scanner – Archive",
    category: "IT Equipment",
    location: "Archive Room",
    model: "Canon DR-C225",
    manufacturer: "Canon",
    condition: ASSET_CONDITION.POOR,
    status: ASSET_STATUS.RETIRED,
  },
];

async function clearDatabase() {
  console.log("Clearing existing data...");
  // AssetHistory blocks mongoose deleteMany (permanent history).
  // Native collection API is allowed only for seed reset.
  await Promise.all([
    Notification.collection.deleteMany({}),
    MaintenanceLog.collection.deleteMany({}),
    MaintenanceSchedule.collection.deleteMany({}),
    AuditLog.collection.deleteMany({}),
    AssetHistory.collection.deleteMany({}),
    Issue.collection.deleteMany({}),
    Asset.collection.deleteMany({}),
    User.collection.deleteMany({}),
  ]);
  console.log("Database cleared.");
}

async function seedUsers() {
  console.log("Seeding users...");
  const users = [];
  for (const u of usersData) {
    const user = await User.create(u);
    users.push(user);
    console.log(`  + ${user.role}: ${user.email}`);
  }
  return users;
}

async function seedAssets(admin) {
  console.log("Seeding assets (22)...");
  const assets = [];
  const now = Date.now();

  for (let i = 0; i < assetsData.length; i++) {
    const data = assetsData[i];
    const lastService = new Date(now - (20 + i * 3) * 24 * 60 * 60 * 1000);
    const nextService = new Date(now + (10 + i * 2) * 24 * 60 * 60 * 1000);

    const asset = await Asset.create({
      ...data,
      description: `${data.name} used in daily operations at ${data.location}.`,
      lastServiceDate:
        data.status === ASSET_STATUS.RETIRED ? lastService : lastService,
      nextServiceDate:
        data.status === ASSET_STATUS.RETIRED ? undefined : nextService,
      organizationName: config.orgName || "MaintainIQ Demo Organization",
      createdBy: admin._id,
      updatedBy: admin._id,
      isRetired: data.status === ASSET_STATUS.RETIRED,
      retiredAt:
        data.status === ASSET_STATUS.RETIRED
          ? new Date(now - 60 * 24 * 60 * 60 * 1000)
          : undefined,
      retiredReason:
        data.status === ASSET_STATUS.RETIRED ? "End of useful life" : undefined,
      totalIssues: 0,
      openIssues: 0,
    });

    try {
      const { dataUrl } = await generateAssetQRDataURL(asset.publicId);
      asset.qrCodeUrl = dataUrl;
      await asset.save();
    } catch {
      // QR optional for seed if qrcode fails
    }

    await AssetHistory.create({
      asset: asset._id,
      action: HISTORY_ACTIONS.ASSET_CREATED,
      description: `Asset "${asset.name}" (${asset.assetCode}) created`,
      actor: admin._id,
      actorName: admin.name,
      actorRole: admin.role,
      metadata: { category: asset.category, location: asset.location },
    });

    assets.push(asset);
    console.log(`  + ${asset.assetCode} – ${asset.name}`);
  }
  return assets;
}

async function seedIssues(assets, users) {
  console.log("Seeding issues (12)...");
  const admin = users.find((u) => u.role === ROLES.ADMIN);
  const tech1 = users.find((u) => u.email === "tech1@maintainiq.demo");
  const tech2 = users.find((u) => u.email === "tech2@maintainiq.demo");
  const tech3 = users.find((u) => u.email === "tech3@maintainiq.demo");

  const issuesSpec = [
    {
      assetIdx: 1, // Projector 02
      title: "Projector display flickering and HDMI not detected",
      description:
        "The projector display is flickering and sometimes does not detect HDMI input from the laptop.",
      priority: PRIORITY.HIGH,
      category: "Connectivity",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech2,
      reporterName: "Student Affairs",
      reporterEmail: "student@campus.edu",
    },
    {
      assetIdx: 4, // Water Cooler
      title: "Water cooler leaking from base",
      description:
        "Water is pooling under the cooler. Possible drain blockage or tank crack.",
      priority: PRIORITY.HIGH,
      category: "Leakage / Performance",
      status: ISSUE_STATUS.MAINTENANCE_IN_PROGRESS,
      assignedTo: tech1,
      maintenanceNotes: "Drain pipe partially blocked. Cleaning in progress.",
      reporterName: "Facility Staff",
    },
    {
      assetIdx: 8, // Printer
      title: "Printer paper jam and error light",
      description: "Frequent paper jams. Error LED stays on after clearing.",
      priority: PRIORITY.MEDIUM,
      category: "Hardware Failure",
      status: ISSUE_STATUS.REPORTED,
      reporterName: "Admin Assistant",
      reporterEmail: "admin.office@campus.edu",
    },
    {
      assetIdx: 14, // Desktop PC
      title: "PC not booting – black screen",
      description:
        "System powers on but no display. Fans spin. Tried different monitor.",
      priority: PRIORITY.HIGH,
      category: "Hardware Failure",
      status: ISSUE_STATUS.INSPECTION_STARTED,
      assignedTo: tech2,
      inspectionNotes: "Checking RAM and GPU seating.",
      reporterName: "Lab Instructor",
    },
    {
      assetIdx: 17, // Water Pump
      title: "Basement pump not starting – critical",
      description:
        "Pump fails to start. Water level rising in sump. Possible motor failure.",
      priority: PRIORITY.CRITICAL,
      category: "Mechanical",
      status: ISSUE_STATUS.WAITING_FOR_PARTS,
      assignedTo: tech3,
      requiresParts: true,
      inspectionNotes:
        "Motor winding resistance out of range. Replacement motor ordered.",
      reporterName: "Maintenance Desk",
      isCritical: true,
    },
    {
      assetIdx: 0, // Projector 01
      title: "Remote control not responding",
      description:
        "Projector remote batteries replaced but still unresponsive. IR sensor may be faulty.",
      priority: PRIORITY.LOW,
      category: "Hardware Failure",
      status: ISSUE_STATUS.RESOLVED,
      assignedTo: tech2,
      maintenanceNotes:
        "Replaced IR receiver module. Tested with spare remote.",
      laborCost: 500,
      parts: [{ name: "IR Receiver Module", quantity: 1, unitCost: 800 }],
      resolvedBy: tech2,
      reporterName: "Faculty Member",
    },
    {
      assetIdx: 2, // Main AC Lobby
      title: "AC weak cooling in afternoon",
      description:
        "Cooling is weak after 2 PM. Filter may be dirty or gas low.",
      priority: PRIORITY.MEDIUM,
      category: "Leakage / Performance",
      status: ISSUE_STATUS.CLOSED,
      assignedTo: tech1,
      maintenanceNotes:
        "Cleaned filters and checked refrigerant. Performance restored.",
      laborCost: 1200,
      resolvedBy: tech1,
      closedBy: admin,
      reporterName: "Reception",
    },
    {
      assetIdx: 11, // Kitchen Fridge
      title: "Refrigerator making unusual noise",
      description: "Loud humming from compressor area for the last two days.",
      priority: PRIORITY.MEDIUM,
      category: "Mechanical",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech3,
      reporterName: "Cafeteria Manager",
    },
    {
      assetIdx: 9, // Conference Display
      title: "HDMI port intermittent on conference display",
      description:
        "HDMI 1 works only after wiggling the cable. Port may be loose.",
      priority: PRIORITY.MEDIUM,
      category: "Connectivity",
      status: ISSUE_STATUS.REPORTED,
      reporterName: "Events Team",
    },
    {
      assetIdx: 5, // Fire Extinguisher
      title: "Pressure gauge in red zone",
      description:
        "Fire extinguisher pressure needle is in the red. Needs recharge or replacement.",
      priority: PRIORITY.CRITICAL,
      category: "Safety Hazard",
      status: ISSUE_STATUS.REPORTED,
      isCritical: true,
      reporterName: "Safety Officer",
    },
    {
      assetIdx: 12, // Generator
      title: "Generator auto-start failed during power cut",
      description:
        "During last outage generator did not auto-start. Manual start worked after 2 minutes.",
      priority: PRIORITY.HIGH,
      category: "Electrical",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech1,
      reporterName: "Security Desk",
    },
    {
      assetIdx: 15, // UPS
      title: "UPS beeping intermittently",
      description:
        "UPS emits short beeps every few minutes even on utility power.",
      priority: PRIORITY.MEDIUM,
      category: "Electrical",
      status: ISSUE_STATUS.REOPENED,
      assignedTo: tech1,
      maintenanceNotes:
        "Earlier battery check was inconclusive. Reopening for deeper diagnostics.",
      reporterName: "IT Admin",
    },
    {
      assetIdx: 3,
      title: "Server room AC filter overdue for replacement",
      description:
        "Preventive filter change is overdue. Dust buildup may affect cooling efficiency.",
      priority: PRIORITY.MEDIUM,
      category: "Preventive",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech1,
      reporterName: "IT Ops",
    },
    {
      assetIdx: 6,
      title: "Microscope stage stuck on Y-axis",
      description:
        "Fine focus works but stage movement on Y-axis is stiff. Needs lubrication and inspection.",
      priority: PRIORITY.HIGH,
      category: "Mechanical",
      status: ISSUE_STATUS.REPORTED,
      reporterName: "Lab Assistant",
    },
    {
      assetIdx: 7,
      title: "Core switch intermittent packet loss",
      description:
        "Monitoring shows brief packet loss spikes on uplink port 1 during peak hours.",
      priority: PRIORITY.CRITICAL,
      category: "Connectivity",
      status: ISSUE_STATUS.INSPECTION_STARTED,
      assignedTo: tech2,
      inspectionNotes: "Checking SFP and cable integrity.",
      isCritical: true,
      reporterName: "Network Admin",
    },
    {
      assetIdx: 10,
      title: "Exit light battery not holding charge",
      description:
        "After power cut test, exit light stayed on only 20 minutes (required 90).",
      priority: PRIORITY.HIGH,
      category: "Safety Hazard",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech1,
      reporterName: "Safety Officer",
    },
    {
      assetIdx: 13,
      title: "Gate camera night vision washed out",
      description:
        "IR LEDs seem weak; night recordings are grainy beyond 8 meters.",
      priority: PRIORITY.MEDIUM,
      category: "Hardware Failure",
      status: ISSUE_STATUS.REPORTED,
      reporterName: "Security Desk",
    },
    {
      assetIdx: 16,
      title: "Interactive whiteboard touch calibration drift",
      description:
        "Touch points register 2-3cm offset on the right side of the panel.",
      priority: PRIORITY.LOW,
      category: "Software / Firmware",
      status: ISSUE_STATUS.ASSIGNED,
      assignedTo: tech2,
      reporterName: "Faculty",
    },
  ];

  const issues = [];

  for (const spec of issuesSpec) {
    const asset = assets[spec.assetIdx];
    const now = new Date();

    const reportedAt = new Date(
      now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000,
    );
    const slaHours = SLA_HOURS_BY_PRIORITY[spec.priority] ?? 72;
    const dueAt = new Date(reportedAt.getTime() + slaHours * 60 * 60 * 1000);
    const issueData = {
      asset: asset._id,
      title: spec.title,
      description: spec.description,
      priority: spec.priority,
      category: spec.category,
      status: spec.status,
      reporterName: spec.reporterName,
      reporterEmail: spec.reporterEmail,
      isCritical: spec.isCritical || spec.priority === PRIORITY.CRITICAL,
      reportedAt,
      slaHours,
      dueAt,
      slaBreached:
        ![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED].includes(spec.status) &&
        dueAt < now,
    };

    if (spec.assignedTo) {
      issueData.assignedTo = spec.assignedTo._id;
      issueData.assignedBy = admin._id;
      issueData.assignedAt = new Date(issueData.reportedAt.getTime() + 3600000);
    }
    if (spec.inspectionNotes) issueData.inspectionNotes = spec.inspectionNotes;
    if (spec.maintenanceNotes)
      issueData.maintenanceNotes = spec.maintenanceNotes;
    if (spec.laborCost) issueData.laborCost = spec.laborCost;
    if (spec.parts) issueData.parts = spec.parts;
    if (spec.requiresParts) issueData.requiresParts = true;
    if (spec.resolvedBy) {
      issueData.resolvedBy = spec.resolvedBy._id;
      issueData.resolvedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }
    if (spec.closedBy) {
      issueData.closedBy = spec.closedBy._id;
      issueData.closedAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
    if (spec.status === ISSUE_STATUS.INSPECTION_STARTED) {
      issueData.inspectionStartedAt = new Date(now.getTime() - 5 * 3600000);
    }
    if (spec.status === ISSUE_STATUS.MAINTENANCE_IN_PROGRESS) {
      issueData.maintenanceStartedAt = new Date(now.getTime() - 3 * 3600000);
    }
    if (spec.status === ISSUE_STATUS.REOPENED) {
      issueData.reopenedAt = new Date(now.getTime() - 12 * 3600000);
    }

    const issue = await Issue.create(issueData);

    // Update asset counters
    asset.totalIssues = (asset.totalIssues || 0) + 1;
    const isOpen = ![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED].includes(
      spec.status,
    );
    if (isOpen) asset.openIssues = (asset.openIssues || 0) + 1;
    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: HISTORY_ACTIONS.ISSUE_REPORTED,
      description: `Issue ${issue.issueNumber} reported: "${issue.title}"`,
      actorName: spec.reporterName || "Public Reporter",
      actorRole: "PUBLIC",
      issue: issue._id,
      issueNumber: issue.issueNumber,
    });

    if (spec.assignedTo) {
      await AssetHistory.create({
        asset: asset._id,
        action: HISTORY_ACTIONS.ISSUE_ASSIGNED,
        description: `Issue ${issue.issueNumber} assigned to ${spec.assignedTo.name}`,
        actor: admin._id,
        actorName: admin.name,
        actorRole: admin.role,
        issue: issue._id,
        issueNumber: issue.issueNumber,
      });
    }

    if (
      spec.status === ISSUE_STATUS.RESOLVED ||
      spec.status === ISSUE_STATUS.CLOSED
    ) {
      await AssetHistory.create({
        asset: asset._id,
        action: HISTORY_ACTIONS.ISSUE_RESOLVED,
        description: `Issue ${issue.issueNumber} resolved`,
        actor: spec.resolvedBy?._id || admin._id,
        actorName: spec.resolvedBy?.name || admin.name,
        issue: issue._id,
        issueNumber: issue.issueNumber,
        metadata: { totalCost: issue.totalCost },
      });

      await MaintenanceLog.create({
        issue: issue._id,
        asset: asset._id,
        performedBy: spec.resolvedBy?._id || tech1._id,
        workPerformed: spec.maintenanceNotes || "Maintenance completed",
        findings: spec.inspectionNotes,
        partsUsed: spec.parts || [],
        laborCost: spec.laborCost || 0,
        completedAt: issue.resolvedAt || now,
      });
    }

    issues.push(issue);
    console.log(
      `  + ${issue.issueNumber} – ${issue.title.slice(0, 50)}... [${issue.status}]`,
    );
  }

  return issues;
}

async function seedMaintenance(assets, users) {
  console.log("Seeding maintenance schedules (14)...");
  const admin = users.find((u) => u.role === ROLES.ADMIN);
  const supervisor = users.find((u) => u.role === ROLES.SUPERVISOR);
  const tech1 = users.find((u) => u.email === "tech1@maintainiq.demo");
  const tech2 = users.find((u) => u.email === "tech2@maintainiq.demo");
  const tech3 = users.find((u) => u.email === "tech3@maintainiq.demo");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const specs = [
    {
      assetIdx: 2,
      title: "Quarterly AC filter & coil clean – Lobby",
      description: "Replace filters, clean coils, check refrigerant pressure.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: 5,
      assignedTo: tech1,
      priority: "High",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 3,
      title: "Monthly server-room HVAC inspection",
      description: "Temperature log review, filter check, condensate drain.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: 2,
      assignedTo: tech1,
      priority: "Critical",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 5,
      title: "Annual fire extinguisher pressure test",
      description: "Verify gauge, weight, and certification tag.",
      frequency: MAINTENANCE_FREQUENCY.YEARLY,
      daysFromNow: 12,
      assignedTo: tech3,
      priority: "High",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 7,
      title: "Core switch firmware review",
      description: "Check vendor advisories and backup running config.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: 20,
      assignedTo: tech2,
      priority: "Medium",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 12,
      title: "Generator load-bank test",
      description: "Run under load for 30 minutes; log voltage and frequency.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: -3,
      assignedTo: tech1,
      priority: "Critical",
      status: MAINTENANCE_STATUS.OVERDUE,
    },
    {
      assetIdx: 15,
      title: "UPS battery health check",
      description: "Runtime test and battery age assessment.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: 1,
      assignedTo: tech1,
      priority: "High",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 4,
      title: "Water cooler sanitization",
      description: "Flush tank, sanitize nozzle, replace carbon filter.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: 8,
      assignedTo: tech3,
      priority: "Medium",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 13,
      title: "CCTV lens clean & focus check – Gate",
      description: "Clean dome, verify IR and night focus.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: 4,
      assignedTo: tech2,
      priority: "Medium",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 20,
      title: "Medical fridge temperature calibration",
      description: "Verify probe against certified thermometer; log results.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: 3,
      assignedTo: tech2,
      priority: "Critical",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 0,
      title: "Projector lamp hours & filter dust-out",
      description: "Check lamp life counter; vacuum intake filters.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: -10,
      assignedTo: tech2,
      priority: "Low",
      status: MAINTENANCE_STATUS.COMPLETED,
      completed: true,
    },
    {
      assetIdx: 11,
      title: "Kitchen fridge condenser coil clean",
      description: "Brush coils, check door gaskets.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: 15,
      assignedTo: tech3,
      priority: "Medium",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 17,
      title: "Basement pump preventive service",
      description: "Lubricate, check seals, test float switch.",
      frequency: MAINTENANCE_FREQUENCY.MONTHLY,
      daysFromNow: -1,
      assignedTo: tech3,
      priority: "High",
      status: MAINTENANCE_STATUS.OVERDUE,
    },
    {
      assetIdx: 8,
      title: "Admin printer roller & fuser inspection",
      description: "Inspect pickup rollers; clean paper path.",
      frequency: MAINTENANCE_FREQUENCY.QUARTERLY,
      daysFromNow: 25,
      assignedTo: tech2,
      priority: "Low",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
    {
      assetIdx: 9,
      title: "Conference display cable & port service",
      description: "Reseat HDMI, clean ports, test all inputs.",
      frequency: MAINTENANCE_FREQUENCY.YEARLY,
      daysFromNow: 40,
      assignedTo: tech2,
      priority: "Low",
      status: MAINTENANCE_STATUS.SCHEDULED,
    },
  ];

  const created = [];
  for (const spec of specs) {
    const asset = assets[spec.assetIdx];
    if (!asset) continue;
    const scheduledDate = new Date(now + spec.daysFromNow * day);
    const doc = await MaintenanceSchedule.create({
      asset: asset._id,
      title: spec.title,
      description: spec.description,
      frequency: spec.frequency,
      scheduledDate,
      nextDueDate: scheduledDate,
      status: spec.status,
      assignedTo: spec.assignedTo?._id,
      createdBy: admin._id,
      priority: spec.priority,
      completedAt: spec.completed ? new Date(now - 2 * day) : undefined,
      completedBy: spec.completed
        ? spec.assignedTo?._id || admin._id
        : undefined,
      notes: spec.completed
        ? "Completed during seed – equipment OK."
        : undefined,
    });

    await AssetHistory.create({
      asset: asset._id,
      action: HISTORY_ACTIONS.SERVICE_SCHEDULED,
      description: `Maintenance scheduled: ${spec.title}`,
      actor: admin._id,
      actorName: admin.name,
      actorRole: admin.role,
    });

    created.push(doc);
    console.log(`  + ${spec.title.slice(0, 48)}... [${spec.status}]`);
  }
  return created;
}

async function seedNotifications(users, issues, schedules) {
  console.log("Seeding notifications...");
  const tech1 = users.find((u) => u.email === "tech1@maintainiq.demo");
  const tech2 = users.find((u) => u.email === "tech2@maintainiq.demo");
  const supervisor = users.find((u) => u.role === ROLES.SUPERVISOR);
  const admin = users.find((u) => u.role === ROLES.ADMIN);

  const items = [];
  const assigned = issues.filter((i) => i.assignedTo);
  for (const issue of assigned.slice(0, 8)) {
    const recipient = issue.assignedTo;
    const n = await Notification.create({
      recipient,
      type: "ISSUE_ASSIGNED",
      title: "New issue assigned",
      message: `Issue ${issue.issueNumber}: "${issue.title}" has been assigned to you.`,
      issue: issue._id,
      asset: issue.asset,
      link: `/issues/${issue._id}`,
      isRead: Math.random() > 0.5,
    });
    items.push(n);
  }

  for (const s of (schedules || []).filter((x) => x.assignedTo).slice(0, 6)) {
    const n = await Notification.create({
      recipient: s.assignedTo,
      type: "MAINTENANCE_DUE",
      title:
        s.status === "Overdue" ? "Maintenance overdue" : "Maintenance due soon",
      message: `"${s.title}" is on your schedule.`,
      asset: s.asset,
      link: "/maintenance",
      isRead: false,
    });
    items.push(n);
  }

  // Supervisor / admin sample alerts
  if (issues[0]) {
    await Notification.create({
      recipient: supervisor._id,
      type: "ISSUE_STATUS_UPDATED",
      title: "Critical issue activity",
      message: "A critical priority issue was updated in the last seed cycle.",
      issue: issues[0]._id,
      link: `/issues/${issues[0]._id}`,
      isRead: false,
    });
    items.push(1);
  }

  console.log(`  + ${items.length} notifications`);
  return items;
}

async function seedAudit(users, assets) {
  console.log("Seeding audit log samples...");
  const admin = users.find((u) => u.role === ROLES.ADMIN);
  const logs = [
    {
      action: "USER_CREATED",
      summary: `${admin.name} created TECHNICIAN account for tech1@maintainiq.demo`,
      targetType: "User",
      targetId: users.find((u) => u.email === "tech1@maintainiq.demo")?._id,
      metadata: { role: "TECHNICIAN" },
    },
    {
      action: "USER_CREATED",
      summary: `${admin.name} created SUPERVISOR account for supervisor@maintainiq.demo`,
      targetType: "User",
      targetId: users.find((u) => u.role === ROLES.SUPERVISOR)?._id,
      metadata: { role: "SUPERVISOR" },
    },
    {
      action: "ASSET_RETIRED",
      summary: `${admin.name} retired asset ${assets[assets.length - 1]?.assetCode} (${assets[assets.length - 1]?.name})`,
      targetType: "Asset",
      targetId: assets[assets.length - 1]?._id,
      metadata: { reason: "End of useful life" },
    },
    {
      action: "USER_ACTIVATED",
      summary: `${admin.name} activated tech2@maintainiq.demo`,
      targetType: "User",
      targetId: users.find((u) => u.email === "tech2@maintainiq.demo")?._id,
    },
  ];

  for (const row of logs) {
    await AuditLog.create({
      ...row,
      actor: admin._id,
      actorName: admin.name,
      actorRole: admin.role,
    });
  }
  console.log(`  + ${logs.length} audit entries`);
}

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);
    console.log("Connected.\n");

    await clearDatabase();
    const users = await seedUsers();
    const admin = users.find((u) => u.role === ROLES.ADMIN);
    const assets = await seedAssets(admin);
    const issues = await seedIssues(assets, users);
    const schedules = await seedMaintenance(assets, users);
    await seedNotifications(users, issues, schedules);
    await seedAudit(users, assets);

    console.log("\n========== SEED COMPLETE ==========");
    console.log(`Users:        ${users.length}`);
    console.log(`Assets:       ${assets.length}`);
    console.log(`Issues:       ${issues.length}`);
    console.log(`Maintenance:  ${schedules.length}`);
    console.log("\nDemo credentials (password for all: Demo@12345)");
    console.log("  Admin:       admin@maintainiq.demo");
    console.log("  Supervisor:  supervisor@maintainiq.demo");
    console.log("  Technician:  tech1@maintainiq.demo");
    console.log("  Technician:  tech2@maintainiq.demo");
    console.log("  Technician:  tech3@maintainiq.demo");
    console.log("===================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
