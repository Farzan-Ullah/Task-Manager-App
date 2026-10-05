/**
 * Database Seeder for ProManage / Task-Manager-App
 * Creates a rich, realistic agile development workspace:
 * - 5 Users (Admin, PM, Engineers, QA, UI) with secure hashed passwords
 * - 2 Workspaces (Primary & Secondary for multi-tenancy testing)
 * - 2 Projects (PROJ and MOB) with custom workflows
 * - 2 Kanban Boards with configured WIP limits
 * - 3 Sprints (Completed, Active, Planned)
 * - 18 Rich Issues with story points, LexoRank ordering, checklist items, and tags
 * - 12 Time Logs for Timesheet & Burndown reporting
 * - Realistic Comments with user mentions
 * - Audit Trail Activity logs
 * - Automation Rules
 * - Notifications
 */

const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  User,
  Workspace,
  Project,
  Board,
  Issue,
  Sprint,
  Comment,
  TimeLog,
  Activity,
  Automation,
  Notification,
  Counter,
} = require("../models");
const { initialRank } = require("../utils/lexorank");

const ATLAS_URI =
  process.env.ATLAS_URI ||
  process.env.MONGODB_URI;

async function seedDatabase(targetUri, label = "Active Database") {
  console.log("==================================================");
  console.log(`Seeding Database [${label}]...`);
  console.log(`URI: ${targetUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  console.log("==================================================");

  // Disconnect if already connected to a different DB
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(targetUri);
  console.log("Connected to MongoDB successfully.");

  // Clean existing collections to ensure a consistent, non-corrupted state
  console.log("Cleaning old test collections...");
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Project.deleteMany({}),
    Board.deleteMany({}),
    Issue.deleteMany({}),
    Sprint.deleteMany({}),
    Comment.deleteMany({}),
    TimeLog.deleteMany({}),
    Activity.deleteMany({}),
    Automation.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log("Old collections cleaned.");

  // 1. Create Users
  console.log("Creating users...");
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  const usersData = [
    {
      name: "Farzan Ullah",
      email: "farzanullah07@gmail.com",
      password: defaultPasswordHash,
      role: "Admin",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=faces",
    },
    {
      name: "Alex Morgan",
      email: "testing123@gmail.com",
      password: defaultPasswordHash,
      role: "Employee",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=faces",
    },
    {
      name: "Sarah Connor",
      email: "techzen@gmail.com",
      password: defaultPasswordHash,
      role: "Admin",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=faces",
    },
    {
      name: "Arselan Khan",
      email: "arselan@gmail.com",
      password: defaultPasswordHash,
      role: "Employee",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&fit=crop&crop=faces",
    },
    {
      name: "Emily Watson",
      email: "user@gmail.com",
      password: defaultPasswordHash,
      role: "Employee",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&fit=crop&crop=faces",
    },
  ];

  const createdUsers = await User.insertMany(usersData);
  const [farzan, alex, sarah, arselan, emily] = createdUsers;
  console.log(`Created ${createdUsers.length} users (all with password: Password123!)`);

  // 2. Create Workspaces
  console.log("Creating workspaces...");
  const primaryWorkspace = new Workspace({
    name: "TechZen Innovations",
    owner: farzan._id,
    inviteCode: "TECHZEN1",
    plan: "Pro",
    members: [
      { userId: farzan._id, role: "Workspace Admin", status: "ACTIVE" },
      { userId: sarah._id, role: "Project Manager", status: "ACTIVE" },
      { userId: alex._id, role: "Member", status: "ACTIVE" },
      { userId: arselan._id, role: "Member", status: "ACTIVE" },
      { userId: emily._id, role: "Member", status: "ACTIVE" },
    ],
  });
  await primaryWorkspace.save();

  const secondaryWorkspace = new Workspace({
    name: "Acme Digital Lab",
    owner: farzan._id,
    inviteCode: "ACMELAB2",
    plan: "Free",
    members: [
      { userId: farzan._id, role: "Workspace Admin", status: "ACTIVE" },
      { userId: sarah._id, role: "Member", status: "ACTIVE" },
    ],
  });
  await secondaryWorkspace.save();

  // Update user workspace links
  for (const u of createdUsers) {
    u.workspace = primaryWorkspace._id;
    u.workspaces = [
      {
        workspaceId: primaryWorkspace._id,
        role: u._id.equals(farzan._id)
          ? "Workspace Admin"
          : u._id.equals(sarah._id)
          ? "Project Manager"
          : "Member",
      },
      ...(u._id.equals(farzan._id) || u._id.equals(sarah._id)
        ? [
            {
              workspaceId: secondaryWorkspace._id,
              role: u._id.equals(farzan._id) ? "Workspace Admin" : "Member",
            },
          ]
        : []),
    ];
    await u.save();
  }
  console.log("Created 2 workspaces and linked members.");

  // 3. Create Projects
  console.log("Creating projects...");
  const projectMain = new Project({
    workspaceId: primaryWorkspace._id,
    key: "PROJ",
    name: "ProManage Core Platform",
    description: "Next-gen Jira & Trello agile workflow management platform with real-time sync.",
    leadId: farzan._id,
    members: [
      { userId: farzan._id, role: "Project Manager" },
      { userId: sarah._id, role: "Project Manager" },
      { userId: alex._id, role: "Member" },
      { userId: arselan._id, role: "Member" },
      { userId: emily._id, role: "Member" },
    ],
    settings: {
      defaultAssignee: alex._id,
      issueTypes: ["Story", "Task", "Bug"],
      priorities: ["Highest", "High", "Medium", "Low", "Lowest"],
    },
  });
  await projectMain.save();

  const projectMobile = new Project({
    workspaceId: primaryWorkspace._id,
    key: "MOB",
    name: "Mobile Client App",
    description: "React Native & iOS/Android mobile clients with offline support.",
    leadId: sarah._id,
    members: [
      { userId: sarah._id, role: "Project Manager" },
      { userId: farzan._id, role: "Member" },
      { userId: alex._id, role: "Member" },
      { userId: emily._id, role: "Member" },
    ],
    settings: {
      defaultAssignee: sarah._id,
      issueTypes: ["Story", "Task", "Bug"],
      priorities: ["Highest", "High", "Medium", "Low", "Lowest"],
    },
  });
  await projectMobile.save();
  console.log("Created projects PROJ and MOB.");

  // 4. Create Kanban Boards
  console.log("Creating boards...");
  const boardMain = new Board({
    projectId: projectMain._id,
    name: "Engineering Kanban Board",
    columns: [
      { id: "backlog", name: "Backlog", wipLimit: 0, statusMap: "Backlog", order: 0 },
      { id: "todo", name: "To Do", wipLimit: 0, statusMap: "To Do", order: 1 },
      { id: "in-progress", name: "In Progress", wipLimit: 5, statusMap: "In Progress", order: 2 },
      { id: "review", name: "Review", wipLimit: 3, statusMap: "Review", order: 3 },
      { id: "testing", name: "Testing", wipLimit: 3, statusMap: "Testing", order: 4 },
      { id: "done", name: "Done", wipLimit: 0, statusMap: "Done", order: 5 },
    ],
  });
  await boardMain.save();

  const boardMobile = new Board({
    projectId: projectMobile._id,
    name: "Mobile Sprint Board",
    columns: [
      { id: "backlog", name: "Backlog", wipLimit: 0, statusMap: "Backlog", order: 0 },
      { id: "todo", name: "To Do", wipLimit: 0, statusMap: "To Do", order: 1 },
      { id: "in-progress", name: "In Progress", wipLimit: 4, statusMap: "In Progress", order: 2 },
      { id: "review", name: "Review", wipLimit: 2, statusMap: "Review", order: 3 },
      { id: "testing", name: "Testing", wipLimit: 2, statusMap: "Testing", order: 4 },
      { id: "done", name: "Done", wipLimit: 0, statusMap: "Done", order: 5 },
    ],
  });
  await boardMobile.save();
  console.log("Created Kanban boards.");

  // 5. Create Sprints
  console.log("Creating sprints...");
  const now = new Date();
  const sprint1Completed = new Sprint({
    projectId: projectMain._id,
    name: "Sprint 1 - Foundation & Architecture",
    goal: "Setup full-stack monorepo, MongoDB Atlas schemas, and JWT authentication.",
    startDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    status: "COMPLETED",
    committedPoints: 24,
  });
  await sprint1Completed.save();

  const sprint2Active = new Sprint({
    projectId: projectMain._id,
    name: "Sprint 2 - Agile Views & Realtime Sync",
    goal: "Deliver interactive Kanban, Backlog, Calendar, Gantt, and WebSockets.",
    startDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    status: "ACTIVE",
    committedPoints: 35,
  });
  await sprint2Active.save();

  const sprint3Planned = new Sprint({
    projectId: projectMain._id,
    name: "Sprint 3 - Automations & Analytics",
    goal: "Automation rule engine, CSV/PDF reports export, and timesheet tracking.",
    startDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
    status: "PLANNED",
    committedPoints: 28,
  });
  await sprint3Planned.save();
  console.log("Created 3 sprints (1 Completed, 1 Active, 1 Planned).");

  // 6. Create Issues
  console.log("Creating issues...");
  const issuesRaw = [
    // Completed Sprint 1 Issues
    {
      key: "PROJ-101",
      title: "Establish MERN Architecture & Secure Authentication",
      description: "Set up Express server with JWT cookies, bcrypt hashing, and React 19 client routing.",
      type: "Story",
      status: "Done",
      priority: "Highest",
      estimate: 8,
      assigneeId: farzan._id,
      reporterId: farzan._id,
      sprintId: sprint1Completed._id,
      labels: ["backend", "auth", "security"],
      startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Define User & Workspace schemas", completed: true },
        { title: "JWT token verification middleware", completed: true },
        { title: "Login & Register UI forms", completed: true },
      ],
    },
    {
      key: "PROJ-102",
      title: "Design Responsive Modern Dashboard Shell",
      description: "Implement collapsible sidebar, header with workspace switcher, and theme provider.",
      type: "Task",
      status: "Done",
      priority: "High",
      estimate: 5,
      assigneeId: emily._id,
      reporterId: sarah._id,
      sprintId: sprint1Completed._id,
      labels: ["frontend", "ui", "layout"],
      startDate: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Top navbar with profile menu", completed: true },
        { title: "Responsive sidebar with active states", completed: true },
      ],
    },
    {
      key: "PROJ-103",
      title: "Implement Multi-Tenant Workspace Isolation",
      description: "Ensure all data access is strictly partitioned by workspaceId with RBAC enforcement.",
      type: "Story",
      status: "Done",
      priority: "Highest",
      estimate: 8,
      assigneeId: alex._id,
      reporterId: farzan._id,
      sprintId: sprint1Completed._id,
      labels: ["backend", "architecture", "multi-tenant"],
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Workspace schema indexes", completed: true },
        { title: "RBAC permission checks", completed: true },
      ],
    },

    // Active Sprint 2 Issues
    {
      key: "PROJ-104",
      title: "Interactive Kanban Board with Drag-and-Drop",
      description: "Full Jira-style Kanban board supporting @hello-pangea/dnd column reordering and WIP limit warnings.",
      type: "Story",
      status: "In Progress",
      priority: "Highest",
      estimate: 8,
      assigneeId: alex._id,
      reporterId: sarah._id,
      sprintId: sprint2Active._id,
      labels: ["frontend", "board", "dnd"],
      startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Card drag previews", completed: true },
        { title: "Column WIP badges", completed: true },
        { title: "Optimistic state updates", completed: false },
      ],
    },
    {
      key: "PROJ-105",
      title: "Light and Dark Mode Theme Switcher",
      description: "Provide smooth theme toggling using Tailwind v4 custom variants and localStorage persistence.",
      type: "Task",
      status: "Done",
      priority: "Medium",
      estimate: 3,
      assigneeId: emily._id,
      reporterId: farzan._id,
      sprintId: sprint2Active._id,
      labels: ["frontend", "theme", "tailwind"],
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Tailwind v4 @custom-variant dark", completed: true },
        { title: "ThemeToggle button component", completed: true },
        { title: "Theme sync with OS preference", completed: true },
      ],
    },
    {
      key: "PROJ-106",
      title: "Forgot Password & Secure Reset Token Flow",
      description: "Cryptographically generated SHA-256 tokens with 1-hour expiration, token validation endpoint and reset UI.",
      type: "Story",
      status: "Done",
      priority: "High",
      estimate: 5,
      assigneeId: farzan._id,
      reporterId: sarah._id,
      sprintId: sprint2Active._id,
      labels: ["backend", "frontend", "auth"],
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Crypto token generator", completed: true },
        { title: "Verify token endpoint", completed: true },
        { title: "Reset password screen", completed: true },
      ],
    },
    {
      key: "PROJ-107",
      title: "Fix Token Expiry WebSocket Reconnection Loop",
      description: "Socket.IO attempts infinite reconnect when auth token has expired without re-fetching refreshed token.",
      type: "Bug",
      status: "Testing",
      priority: "Highest",
      estimate: 3,
      assigneeId: arselan._id,
      reporterId: alex._id,
      sprintId: sprint2Active._id,
      labels: ["bug", "websocket", "network"],
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Reproduce disconnect loop", completed: true },
        { title: "Add auth refresh callback", completed: true },
        { title: "Regression test across browsers", completed: false },
      ],
    },
    {
      key: "PROJ-108",
      title: "Interactive Gantt Timeline View with Dependencies",
      description: "Timeline view showing issue schedules, progress bars, sprint milestones, and pan/zoom controls.",
      type: "Story",
      status: "In Progress",
      priority: "High",
      estimate: 5,
      assigneeId: alex._id,
      reporterId: sarah._id,
      sprintId: sprint2Active._id,
      labels: ["frontend", "views", "gantt"],
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "SVG timeline bar renderer", completed: true },
        { title: "Drag bar handles to resize dates", completed: false },
      ],
    },
    {
      key: "PROJ-109",
      title: "Real-Time Issue Activity Feed & Comments",
      description: "Broadcast live issue updates, assignment changes, and comments with author avatars and markdown rendering.",
      type: "Task",
      status: "Review",
      priority: "Medium",
      estimate: 3,
      assigneeId: emily._id,
      reporterId: farzan._id,
      sprintId: sprint2Active._id,
      labels: ["frontend", "activity", "comments"],
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Activity schema & logger", completed: true },
        { title: "Comment thread component", completed: true },
        { title: "Mentions autocomplete", completed: false },
      ],
    },
    {
      key: "PROJ-110",
      title: "Calendar View with Drag-to-Reschedule",
      description: "Monthly and weekly calendar grid displaying issues by due dates with quick-edit popover.",
      type: "Story",
      status: "To Do",
      priority: "Medium",
      estimate: 5,
      assigneeId: emily._id,
      reporterId: sarah._id,
      sprintId: sprint2Active._id,
      labels: ["frontend", "calendar", "views"],
      startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Month/Week view switcher", completed: false },
        { title: "Drag event to new day", completed: false },
      ],
    },
    {
      key: "PROJ-111",
      title: "Resolve EADDRINUSE Port Collision on Server Boot",
      description: "Prevent nodemon crash when background processes leave port 5001 occupied.",
      type: "Bug",
      status: "Done",
      priority: "High",
      estimate: 2,
      assigneeId: farzan._id,
      reporterId: farzan._id,
      sprintId: sprint2Active._id,
      labels: ["backend", "devops", "server"],
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime()),
      tasks: [{ title: "Detect process locks", completed: true }],
    },

    // Sprint 3 Planned Issues
    {
      key: "PROJ-112",
      title: "Automation Rules Engine with Trigger Actions",
      description: "Configurable 'When X happens, if Y condition, do Z action' engine (e.g. notify reporter on Done).",
      type: "Story",
      status: "To Do",
      priority: "High",
      estimate: 8,
      assigneeId: alex._id,
      reporterId: farzan._id,
      sprintId: sprint3Planned._id,
      labels: ["backend", "automations", "workflow"],
      startDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "Rule executor service", completed: false },
        { title: "UI rule builder with presets", completed: false },
      ],
    },
    {
      key: "PROJ-113",
      title: "Export Timesheets & Sprint Reports to CSV / PDF",
      description: "Generate downloadable client reports summarizing work logs, velocity, and burndown data.",
      type: "Task",
      status: "To Do",
      priority: "Medium",
      estimate: 5,
      assigneeId: emily._id,
      reporterId: sarah._id,
      sprintId: sprint3Planned._id,
      labels: ["reports", "export", "analytics"],
      startDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
      tasks: [
        { title: "CSV export endpoint", completed: false },
        { title: "PDF printable stylesheet", completed: false },
      ],
    },
    {
      key: "PROJ-114",
      title: "Safari SVG Icon Misalignment in Sidebar",
      description: "Feather SVG icons show 2px vertical distortion in WebKit browsers on mobile orientation.",
      type: "Bug",
      status: "To Do",
      priority: "Low",
      estimate: 1,
      assigneeId: arselan._id,
      reporterId: emily._id,
      sprintId: sprint3Planned._id,
      labels: ["bug", "css", "safari"],
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      tasks: [{ title: "CSS flex alignment fix", completed: false }],
    },

    // Backlog (No Sprint)
    {
      key: "PROJ-115",
      title: "GitHub / GitLab Webhook Integration",
      description: "Auto-link git commits and pull requests to issues via PROJ-xxx issue key references in commit messages.",
      type: "Story",
      status: "Backlog",
      priority: "Medium",
      estimate: 8,
      assigneeId: null,
      reporterId: farzan._id,
      sprintId: null,
      labels: ["integrations", "github", "webhooks"],
      startDate: null,
      dueDate: null,
      tasks: [],
    },
    {
      key: "PROJ-116",
      title: "Custom Custom-Field Support (Dropdowns, Dates, Numbers)",
      description: "Allow project admins to define dynamic schema fields per issue type.",
      type: "Story",
      status: "Backlog",
      priority: "Low",
      estimate: 13,
      assigneeId: null,
      reporterId: sarah._id,
      sprintId: null,
      labels: ["custom-fields", "architecture"],
      startDate: null,
      dueDate: null,
      tasks: [],
    },

    // Mobile Project Issues
    {
      key: "MOB-101",
      title: "Initialize React Native Expo Project Structure",
      description: "Bootstrap mobile client repo with TypeScript, React Navigation, and Axios client.",
      type: "Story",
      status: "Done",
      priority: "High",
      estimate: 5,
      assigneeId: sarah._id,
      reporterId: sarah._id,
      sprintId: null,
      projectId: projectMobile._id,
      labels: ["mobile", "setup", "react-native"],
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      tasks: [{ title: "Configure Expo SDK 51", completed: true }],
    },
    {
      key: "MOB-102",
      title: "Offline SQLite Cache & Background Synchronization",
      description: "Persist task cards locally with SQLite for instantaneous mobile viewing in offline mode.",
      type: "Story",
      status: "In Progress",
      priority: "Highest",
      estimate: 8,
      assigneeId: alex._id,
      reporterId: sarah._id,
      sprintId: null,
      projectId: projectMobile._id,
      labels: ["mobile", "offline", "sqlite"],
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      tasks: [{ title: "SQLite schema migration", completed: true }],
    },
  ];

  const createdIssues = [];
  for (let i = 0; i < issuesRaw.length; i++) {
    const raw = issuesRaw[i];
    const isMobile = raw.key.startsWith("MOB");
    const proj = isMobile ? projectMobile : projectMain;

    const issueDoc = new Issue({
      ...raw,
      projectId: proj._id,
      workspace: primaryWorkspace._id,
      rank: initialRank(i),
      user: raw.reporterId,
      assignee: raw.assigneeId,
      date: raw.dueDate,
    });
    await issueDoc.save();
    createdIssues.push(issueDoc);
  }
  console.log(`Created ${createdIssues.length} issues.`);

  // 7. Update Sequence Counters
  await Counter.findOneAndUpdate(
    { projectId: projectMain._id },
    { $set: { seq: 116 } },
    { upsert: true }
  );
  await Counter.findOneAndUpdate(
    { projectId: projectMobile._id },
    { $set: { seq: 102 } },
    { upsert: true }
  );

  // 8. Create Time Logs (for Timesheets and Reports)
  console.log("Creating time logs...");
  const issue104 = createdIssues.find((i) => i.key === "PROJ-104");
  const issue105 = createdIssues.find((i) => i.key === "PROJ-105");
  const issue106 = createdIssues.find((i) => i.key === "PROJ-106");
  const issue108 = createdIssues.find((i) => i.key === "PROJ-108");

  const timeLogsData = [
    {
      issueId: issue104._id,
      userId: alex._id,
      projectId: projectMain._id,
      minutes: 180,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      note: "Built Kanban column drop targets and drag animations.",
    },
    {
      issueId: issue104._id,
      userId: alex._id,
      projectId: projectMain._id,
      minutes: 120,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      note: "Refactored column WIP limits and warning banners.",
    },
    {
      issueId: issue105._id,
      userId: emily._id,
      projectId: projectMain._id,
      minutes: 150,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      note: "Configured Tailwind v4 dark variant tokens across all views.",
    },
    {
      issueId: issue106._id,
      userId: farzan._id,
      projectId: projectMain._id,
      minutes: 240,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      note: "Implemented crypto token hashing and reset verification API.",
    },
    {
      issueId: issue108._id,
      userId: alex._id,
      projectId: projectMain._id,
      minutes: 180,
      date: new Date(now.getTime()),
      note: "Drafted Gantt timeline SVG scale and date markers.",
    },
    {
      issueId: issue105._id,
      userId: emily._id,
      projectId: projectMain._id,
      minutes: 90,
      date: new Date(now.getTime()),
      note: "Polished theme toggle icon animations and Settings card.",
    },
  ];

  await TimeLog.insertMany(timeLogsData);
  console.log(`Created ${timeLogsData.length} time logs.`);

  // 9. Create Comments
  console.log("Creating comments...");
  const commentsData = [
    {
      issueId: issue104._id,
      authorId: sarah._id,
      body: "Great progress on the drag-and-drop mechanics! Let's ensure the drop animation stays at 60fps on low-end hardware.",
      mentions: [alex._id],
    },
    {
      issueId: issue104._id,
      authorId: alex._id,
      body: "@Sarah Connor Just benchmarked with 50 cards per column—running silky smooth using hardware-accelerated transforms.",
      mentions: [sarah._id],
    },
    {
      issueId: issue106._id,
      authorId: farzan._id,
      body: "Password reset tokens now hash via SHA-256 before hitting Mongo. Full end-to-end test passed.",
    },
  ];
  await Comment.insertMany(commentsData);
  console.log(`Created ${commentsData.length} comments.`);

  // 10. Create Activities
  console.log("Creating activity audit logs...");
  const activitiesData = [
    {
      projectId: projectMain._id,
      issueId: issue104._id,
      actorId: alex._id,
      action: "STATUS_CHANGED",
      diff: { from: "To Do", to: "In Progress" },
    },
    {
      projectId: projectMain._id,
      issueId: issue105._id,
      actorId: emily._id,
      action: "STATUS_CHANGED",
      diff: { from: "In Progress", to: "Done" },
    },
    {
      projectId: projectMain._id,
      issueId: issue106._id,
      actorId: farzan._id,
      action: "STATUS_CHANGED",
      diff: { from: "Review", to: "Done" },
    },
    {
      projectId: projectMain._id,
      actorId: farzan._id,
      action: "SPRINT_STARTED",
      diff: { sprintName: sprint2Active.name },
    },
  ];
  await Activity.insertMany(activitiesData);
  console.log(`Created ${activitiesData.length} activity items.`);

  // 11. Create Automations
  console.log("Creating automations...");
  const automationsData = [
    {
      projectId: projectMain._id,
      name: "Auto-notify reporter on Done",
      trigger: {
        type: "STATUS_CHANGED",
        config: { toStatus: "Done" },
      },
      conditions: [
        {
          field: "status",
          operator: "equals",
          value: "Done",
        },
      ],
      actions: [
        {
          type: "NOTIFY_USER",
          config: {
            target: "reporter",
            message: "Your issue has been resolved and moved to Done.",
          },
        },
      ],
      enabled: true,
    },
    {
      projectId: projectMain._id,
      name: "Auto-assign Highest Priority Bugs to Lead",
      trigger: {
        type: "ISSUE_CREATED",
        config: {},
      },
      conditions: [
        { field: "priority", operator: "equals", value: "Highest" },
        { field: "type", operator: "equals", value: "Bug" },
      ],
      actions: [
        {
          type: "ASSIGN_USER",
          config: { userId: farzan._id },
        },
      ],
      enabled: true,
    },
  ];
  await Automation.insertMany(automationsData);
  console.log(`Created ${automationsData.length} automation rules.`);

  // 12. Create Notifications
  console.log("Creating notifications...");
  const notificationsData = [
    {
      userId: farzan._id,
      type: "ASSIGNMENT",
      title: "Issue Assigned",
      message: "Sarah assigned you to PROJ-106: Forgot Password & Secure Reset Token Flow",
      payload: {
        projectId: projectMain._id,
        issueId: issue106._id,
        issueKey: "PROJ-106",
        senderId: sarah._id,
      },
    },
    {
      userId: farzan._id,
      type: "SPRINT_START",
      title: "Sprint 2 Started",
      message: "Sprint 2 - Agile Views & Realtime Sync has commenced!",
      payload: {
        projectId: projectMain._id,
        sprintId: sprint2Active._id,
      },
    },
    {
      userId: farzan._id,
      type: "STATUS_CHANGE",
      title: "Issue Resolved",
      message: "Emily marked PROJ-105 (Theme Switcher) as Done.",
      readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      payload: {
        projectId: projectMain._id,
        issueId: issue105._id,
        issueKey: "PROJ-105",
        senderId: emily._id,
      },
    },
    {
      userId: alex._id,
      type: "MENTION",
      title: "Mentioned in PROJ-104",
      message: "Sarah Connor mentioned you in a comment on PROJ-104",
      payload: {
        projectId: projectMain._id,
        issueId: issue104._id,
        issueKey: "PROJ-104",
        senderId: sarah._id,
      },
    },
  ];
  await Notification.insertMany(notificationsData);
  console.log(`Created ${notificationsData.length} notifications.`);

  console.log("==================================================");
  console.log(`DATABASE SEEDING COMPLETED FOR [${label}]!`);
  console.log("==================================================");
}

async function main() {
  const args = process.argv.slice(2);
  const isAtlas = args.includes("--atlas");
  const isAll = args.includes("--all");

  const activeUri = process.env.MONGODB_URI;

  try {
    if (isAll) {
      if (activeUri) await seedDatabase(activeUri, "Active MONGODB_URI");
      if (ATLAS_URI && ATLAS_URI !== activeUri) {
        await seedDatabase(ATLAS_URI, "MongoDB Atlas");
      }
    } else if (isAtlas) {
      await seedDatabase(ATLAS_URI, "MongoDB Atlas");
    } else {
      if (!activeUri) {
        throw new Error("MONGODB_URI not found in environment variables");
      }
      await seedDatabase(activeUri, "Local / Active MONGODB_URI");
    }

    console.log("\nQuick Access Credentials for Testing:");
    console.log("--------------------------------------------------");
    console.log("Admin User:    farzanullah07@gmail.com  / Password123!");
    console.log("Developer:     testing123@gmail.com     / Password123!");
    console.log("PM / Lead:     techzen@gmail.com        / Password123!");
    console.log("QA Engineer:   arselan@gmail.com        / Password123!");
    console.log("UI Designer:   user@gmail.com           / Password123!");
    console.log("--------------------------------------------------");
    console.log("Workspaces:    TechZen Innovations (Invite: TECHZEN1)");
    console.log("               Acme Digital Lab    (Invite: ACMELAB2)");
    console.log("Projects:      PROJ (ProManage Core), MOB (Mobile Client)");
    console.log("--------------------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  }
}

main();
