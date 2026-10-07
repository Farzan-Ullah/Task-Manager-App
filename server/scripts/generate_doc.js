const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} = require('docx');

// Colors
const PRIMARY_COLOR = '1E1B4B'; // Indigo 950
const ACCENT_COLOR = '4F46E5';  // Indigo 600
const SECONDARY_COLOR = '312E81';// Indigo 900
const TEXT_DARK = '0F172A';     // Slate 900
const TEXT_MUTED = '475569';    // Slate 600
const BORDER_COLOR = 'CBD5E1';  // Slate 300
const BG_HEADER = '1E1B4B';     // Header fill
const BG_ALT_ROW = 'F8FAFC';    // Alternating row
const BG_CALLOUT = 'EEF2FF';    // Indigo 50

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: BORDER_COLOR,
};

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function createHeading1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 32,
        color: PRIMARY_COLOR,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createHeading2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 26,
        color: ACCENT_COLOR,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createHeading3(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22,
        color: TEXT_DARK,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80, line: 260 },
    alignment: options.alignment || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        size: 21,
        color: options.muted ? TEXT_MUTED : TEXT_DARK,
        italic: options.italic || false,
        bold: options.bold || false,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 21,
        color: TEXT_DARK,
        font: 'Segoe UI',
      })
    );
  }
  children.push(
    new TextRun({
      text,
      size: 21,
      color: TEXT_MUTED,
      font: 'Segoe UI',
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40, line: 250 },
    children,
  });
}

function createCallout(title, body) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT_COLOR },
            },
            shading: { type: ShadingType.CLEAR, fill: BG_CALLOUT },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({ text: title, bold: true, size: 21, color: PRIMARY_COLOR, font: 'Segoe UI' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: body, size: 20, color: TEXT_MUTED, font: 'Segoe UI' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers, rows, colWidthPercents = []) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => {
      const cellProps = {
        borders: cellBorders,
        shading: { type: ShadingType.CLEAR, fill: BG_HEADER },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF', font: 'Segoe UI' }),
            ],
          }),
        ],
      };
      if (colWidthPercents[i]) {
        cellProps.width = { size: colWidthPercents[i], type: WidthType.PERCENTAGE };
      }
      return new TableCell(cellProps);
    }),
  });

  const tableRows = [headerRow];

  rows.forEach((row, rowIndex) => {
    const isAlt = rowIndex % 2 === 1;
    const tr = new TableRow({
      children: row.map((cellText, colIndex) => {
        const cellProps = {
          borders: cellBorders,
          shading: { type: ShadingType.CLEAR, fill: isAlt ? BG_ALT_ROW : 'FFFFFF' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0, line: 240 },
              children: [
                new TextRun({
                  text: cellText,
                  size: 20,
                  color: TEXT_DARK,
                  font: 'Segoe UI',
                }),
              ],
            }),
          ],
        };
        if (colWidthPercents[colIndex]) {
          cellProps.width = { size: colWidthPercents[colIndex], type: WidthType.PERCENTAGE };
        }
        return new TableCell(cellProps);
      }),
    });
    tableRows.push(tr);
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

async function buildDoc() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', color: TEXT_DARK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Enterprise Task Manager & Agile Delivery Platform | Technical Documentation',
                    size: 16,
                    color: TEXT_MUTED,
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: TEXT_MUTED, font: 'Segoe UI' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: TEXT_MUTED,
                    font: 'Segoe UI',
                  }),
                  new TextRun({ text: ' of ', size: 16, color: TEXT_MUTED, font: 'Segoe UI' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: TEXT_MUTED,
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // TITLE / COVER SECTION
          new Paragraph({
            spacing: { before: 600, after: 120 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'ENTERPRISE TASK MANAGER',
                bold: true,
                size: 48,
                color: PRIMARY_COLOR,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Agile Delivery, Sprint Planning & Team Analytics Platform',
                bold: true,
                size: 28,
                color: ACCENT_COLOR,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Comprehensive System Architecture, REST API Reference & Process Flow Manual',
                italic: true,
                size: 22,
                color: TEXT_MUTED,
                font: 'Segoe UI',
              }),
            ],
          }),

          createCallout(
            'Document Metadata & Scope',
            'Version: 2.0.0 (Production Release) | System Scope: Monorepo (Client & Server) | Architecture: React 18, Node.js Express, MongoDB Mongoose, Socket.io | Security: JWT, RBAC, Multi-tenancy.'
          ),

          new Paragraph({ spacing: { before: 300, after: 100 } }),

          // SECTION 1: EXECUTIVE SUMMARY
          createHeading1('1. Executive Summary & Core Architecture'),
          createParagraph(
            'The Enterprise Task Manager Platform is a high-performance, real-time Agile delivery solution engineered to provide engineering and product teams with seamless task triage, sprint cadence management, workload balancing, and delivery metrics.'
          ),
          createBullet('Multi-Tenant Organization Workspaces: Isolated tenant structures supporting granular member roles and projects.', 'Workspace Segregation:'),
          createBullet('Interactive Kanban Board & Swimlanes: Smooth drag-and-drop card movements powered by the zero-downtime LexoRank fractional indexing algorithm.', 'Kanban Execution:'),
          createBullet('Full Scrum Iteration Cycle: Sprint planning, committed story points snapshotting, mid-sprint burndown tracking, and completion rollover.', 'Scrum Engine:'),
          createBullet('Real-Time Bi-Directional Collaboration: WebSocket multiplexed project and workspace rooms for live status updates.', 'Live Synchronization:'),
          createBullet('Automated Rule Engine: Event-driven automation system supporting status triggers, conditions, and custom actions.', 'No-Code Automations:'),
          createBullet('Delivery Analytics & Reports: Live Sprint Burndown (dual story points/task count mode), Sprint Velocity, and Cumulative Flow Diagrams (CFD).', 'Business Intelligence:'),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 2: TECH STACK
          createHeading1('2. Comprehensive Technology Stack'),
          createParagraph('The system leverages modern, robust, and industry-standard technologies across all tiers:'),

          createHeading2('2.1 Frontend Architecture'),
          createStyledTable(
            ['Component', 'Technology', 'Version', 'Role & Rationale'],
            [
              ['UI Framework', 'React.js', '^18.2.0', 'Component-driven reactive UI architecture with Hooks'],
              ['Build Tool', 'Vite', '^8.3.x', 'Instant Hot Module Replacement (HMR) and optimized rollup bundle'],
              ['CSS Engine', 'Tailwind CSS', '^3.4.x', 'Custom design system with dark/light themes and responsive design'],
              ['Charts & Analytics', 'Recharts', '^2.12.x', 'Declarative SVG charting for Burndown, Velocity, and CFD'],
              ['Real-Time WebSockets', 'Socket.io-client', '^4.7.x', 'Persistent WebSocket connection for live project updates'],
              ['Icons', 'Lucide React', 'Latest', 'Modern, accessible vector iconography'],
              ['Router', 'React Router DOM', '^6.22.x', 'Client-side routing with nested layouts and route guards'],
              ['HTTP Client', 'Axios', '^1.6.x', 'Promise HTTP client with auth token interceptors and auto error handling'],
            ],
            [20, 20, 15, 45]
          ),

          createHeading2('2.2 Backend & Infrastructure Architecture'),
          createStyledTable(
            ['Component', 'Technology', 'Version', 'Role & Rationale'],
            [
              ['Server Runtime', 'Node.js', 'v20+ / v24.x', 'Event-driven non-blocking asynchronous I/O engine'],
              ['Web Framework', 'Express.js', '^4.18.x', 'Robust RESTful API routing, error middleware, and controllers'],
              ['Database Engine', 'MongoDB Atlas', '^6.0+', 'High-performance document store with indexing and aggregations'],
              ['ODM Framework', 'Mongoose', '^8.2.x', 'Strict schema modeling, relationship population, and pre-save hooks'],
              ['Real-Time Server', 'Socket.io', '^4.7.x', 'Room-partitioned event emitter for multi-client synchronicity'],
              ['Authentication', 'jsonwebtoken (JWT)', '^9.0.x', 'Stateless cryptographic token issuance and verification'],
              ['Password Security', 'BcryptJS', '^2.4.x', 'Salted hashing algorithm for secure credential storage'],
              ['Card Reordering', 'LexoRank Algorithm', 'Custom O(1)', 'Fractional indexing strings preventing full-column reindexing'],
              ['Date Processing', 'Moment.js', '^2.30.x', 'Timezone normalization and daily sprint timeline interpolation'],
            ],
            [20, 20, 15, 45]
          ),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 3: DATABASE ARCHITECTURE
          createHeading1('3. Database Schemas & Data Model Specifications'),
          createParagraph('The database contains 13 production collections configured with compound indexes for maximum throughput:'),

          createHeading2('3.1 Core Collections Overview'),
          createStyledTable(
            ['Collection', 'Mongoose Model', 'Key Responsibilities', 'Key Indexes'],
            [
              ['users', 'User', 'User accounts, hashed passwords, roles, avatars', 'email (unique)'],
              ['workspaces', 'Workspace', 'Multi-tenant organization boundary, memberships', 'slug (unique), owner'],
              ['projects', 'Project', 'Projects within workspace, lead, prefix key', 'workspaceId, key'],
              ['boards', 'Board', 'Kanban columns configuration, WIP limits', 'projectId'],
              ['issues', 'Issue', 'Deliverables, tasks, bugs, story points, rank', 'projectId, sprintId, rank, key'],
              ['sprints', 'Sprint', 'Scrum sprint iterations, start/end dates, points', 'projectId, status'],
              ['timelogs', 'TimeLog', 'Timesheet duration logs, user, issue link', 'issueId, userId, projectId, date'],
              ['automations', 'Automation', 'No-code event triggers, conditions, and actions', 'projectId, isActive'],
              ['activities', 'Activity', 'Audit trail recording all modifications and diffs', 'projectId, createdAt'],
              ['counters', 'Counter', 'Atomic sequential issue number generator (101, 102)', 'projectId (unique)'],
              ['comments', 'Comment', 'Issue discussions and threaded responses', 'issueId, createdAt'],
              ['notifications', 'Notification', 'User alerts, assignment notices, read receipts', 'recipientId, isRead'],
            ],
            [15, 18, 42, 25]
          ),

          createHeading2('3.2 Schema Deep-Dive: Issue Model'),
          createParagraph(
            'The Issue model supports rich hierarchical delivery tracking, story points, LexoRank strings, attachments, and GitHub pull request integrations:'
          ),
          createBullet('type: Enum ["Task", "Bug", "Story", "Issue", "Request"] (Default: "Task")', 'Issue Type:'),
          createBullet('key: Sequential project-scoped identifier (e.g. "PROJ-101", "TECH-105")', 'Unique Key:'),
          createBullet('rank: LexoRank string (e.g. "0|h0001i:") allowing middle insertions in O(1) time', 'Fractional Rank:'),
          createBullet('estimate: Number representing Fibonacci story points (1, 2, 3, 5, 8, 13)', 'Story Points:'),
          createBullet('parentId: Self-referencing ObjectId for sub-tasks (e.g. "PROJ-101-1")', 'Subtasks Hierarchy:'),
          createBullet('pullRequests: Array of linked PR objects (title, prNumber, url, status)', 'Git Integrations:'),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 4: REST API REFERENCE
          createHeading1('4. End-to-End RESTful API Specifications'),
          createParagraph('All protected endpoints require the HTTP header: "Authorization: Bearer <JWT_TOKEN>".'),

          createHeading2('4.1 Authentication & User APIs (/api/v1/auth)'),
          createStyledTable(
            ['Method', 'Endpoint', 'Access Level', 'Request Body / Parameters', 'Expected Response'],
            [
              ['POST', '/api/v1/auth/register', 'Public', '{ name, email, password, companyName }', '201 Created: { token, user, workspace }'],
              ['POST', '/api/v1/auth/login', 'Public', '{ email, password }', '200 OK: { token, user, workspace }'],
              ['POST', '/api/v1/auth/logout', 'Public', 'None', '200 OK: { message: "Logged out successfully" }'],
              ['POST', '/api/v1/auth/forgot-password', 'Public', '{ email }', '200 OK: { message: "Reset token sent" }'],
              ['POST', '/api/v1/auth/reset-password/:token', 'Public', '{ newPassword }', '200 OK: { message: "Password updated" }'],
              ['PUT', '/api/v1/auth/update/:userId', 'Authenticated', '{ name, avatar, bio }', '200 OK: { user }'],
              ['GET', '/api/v1/auth/allUsers', 'Authenticated', 'None', '200 OK: { users: [...] }'],
            ],
            [10, 28, 17, 25, 20]
          ),

          createHeading2('4.2 Workspaces & Projects APIs'),
          createStyledTable(
            ['Method', 'Endpoint', 'RBAC Role', 'Payload / Params', 'Description'],
            [
              ['GET', '/api/v1/workspaces', 'Authenticated', 'None', 'List all workspaces for current user'],
              ['POST', '/api/v1/workspaces', 'Authenticated', '{ name, description }', 'Create new multi-tenant workspace'],
              ['POST', '/api/v1/workspaces/:id/invite', 'Workspace Admin', '{ email, role }', 'Invite new team member to workspace'],
              ['POST', '/api/v1/projects', 'PM / Admin', '{ name, key, workspaceId }', 'Create new project with issue key prefix'],
              ['GET', '/api/v1/projects/:id/board', 'Member', 'id: Project ID', 'Fetch Kanban board columns and WIP limits'],
              ['PATCH', '/api/v1/projects/:id', 'Project Manager', '{ name, description, leadId }', 'Update project configuration'],
            ],
            [10, 28, 17, 22, 23]
          ),

          createHeading2('4.3 Issue Management & Lifecycle APIs'),
          createStyledTable(
            ['Method', 'Endpoint', 'RBAC Role', 'Payload / Params', 'Description'],
            [
              ['GET', '/api/v1/issues', 'Member', 'Query: ?projectId=&sprintId=', 'List and filter project issues'],
              ['POST', '/api/v1/issues', 'Member / PM', '{ title, type, estimate, sprintId }', 'Create issue with auto-generated key'],
              ['PATCH', '/api/v1/issues/:id', 'Member', '{ status, priority, description }', 'Update issue properties'],
              ['PATCH', '/api/v1/issues/:id/move', 'Member', '{ status, prevRank, nextRank }', 'Reorder card via LexoRank in O(1)'],
              ['POST', '/api/v1/issues/bulk/update', 'Project Manager', '{ issueIds: [...], status }', 'Bulk update multiple issues'],
              ['POST', '/api/v1/issues/:id/attachments', 'Member', 'multipart/form-data: file', 'Upload attachment file'],
              ['POST', '/api/v1/issues/:id/pull-requests', 'Member', '{ title, prNumber, url }', 'Link git PR to issue'],
            ],
            [10, 28, 17, 22, 23]
          ),

          createHeading2('4.4 Sprints & Agile Iterations APIs'),
          createStyledTable(
            ['Method', 'Endpoint', 'RBAC Role', 'Payload / Params', 'Description'],
            [
              ['GET', '/api/v1/sprints', 'Member', 'Query: ?projectId=...', 'List all planned, active, completed sprints'],
              ['POST', '/api/v1/sprints', 'Project Manager', '{ name, goal, startDate, endDate }', 'Create new planned sprint'],
              ['POST', '/api/v1/sprints/:id/start', 'Project Manager', '{ startDate, endDate }', 'Start sprint, lock committed points'],
              ['POST', '/api/v1/sprints/:id/complete', 'Project Manager', '{ rolloverTo: "backlog" | "next" }', 'Complete sprint & rollover tasks'],
              ['DELETE', '/api/v1/sprints/:id', 'Project Manager', 'id: Sprint ID', 'Delete sprint and return tasks to backlog'],
            ],
            [10, 28, 17, 22, 23]
          ),

          createHeading2('4.5 Delivery Reports & Analytics APIs'),
          createStyledTable(
            ['Method', 'Endpoint', 'Access', 'Query Parameters', 'Output Metrics'],
            [
              ['GET', '/api/v1/reports/burndown', 'PM / Admin', '?sprintId=...&projectId=...', 'Ideal vs actual daily points/tasks burn, completion rate, issues list'],
              ['GET', '/api/v1/reports/velocity', 'PM / Admin', '?projectId=...', 'Committed vs completed points across past 10 sprints, peak/avg velocity'],
              ['GET', '/api/v1/reports/cumulative-flow', 'PM / Admin', '?projectId=...&days=14', 'Daily distribution of tasks by status (Backlog, To Do, In Progress, Done)'],
              ['GET', '/api/v1/reports/workload', 'PM / Admin', '?projectId=...', 'Assignee task distribution, total points, and active workload capacity'],
              ['GET', '/api/v1/reports/summary', 'PM / Admin', '?projectId=...', 'High-level project KPIs: total issues, completed, overdue, total points'],
            ],
            [10, 28, 14, 23, 25]
          ),

          createHeading2('4.6 Timesheets & Time Tracking APIs'),
          createStyledTable(
            ['Method', 'Endpoint', 'Access Policy', 'Payload / Params', 'Description'],
            [
              ['GET', '/api/v1/time-logs', 'Role Isolated', 'Query: ?projectId=&date=', 'Employees view self logs only; PM/Admin view all team logs'],
              ['POST', '/api/v1/time-logs', 'Authenticated', '{ issueId, duration, date, description }', 'Log duration worked (in minutes) on an issue'],
              ['GET', '/api/v1/time-logs/summary', 'Authenticated', 'Query: ?projectId=&view=weekly', 'Aggregated hours by day/week/user with CSV export data'],
              ['DELETE', '/api/v1/time-logs/:id', 'Owner / PM', 'id: TimeLog ID', 'Remove time log entry'],
            ],
            [10, 25, 17, 23, 25]
          ),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 5: REAL-TIME ARCHITECTURE
          createHeading1('5. Real-Time WebSocket Architecture'),
          createParagraph(
            'The platform uses Socket.io to establish persistent, full-duplex communication channels, partitioned into security rooms:'
          ),
          createStyledTable(
            ['Room Name', 'Broadcast Trigger', 'Event Emitted', 'Client UI Reaction'],
            [
              ['project_${projectId}', 'Card status/rank change', 'issue.moved', 'Card smoothly glides to new column for all viewers'],
              ['project_${projectId}', 'New task created', 'issue.created', 'Card appended to target column immediately'],
              ['project_${projectId}', 'Sprint started/ended', 'sprint.started / completed', 'Backlog view refreshes sprint banner & active board'],
              ['workspace_${workspaceId}', 'Member invited/removed', 'workspace.updated', 'Member roster and role badges update instantly'],
              ['user_${userId}', 'Issue assigned to user', 'notification.new', 'Toast alert notification and bell badge counter increment'],
            ],
            [22, 24, 24, 30]
          ),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 6: KEY PROCESS FLOWS & ALGORITHMS
          createHeading1('6. Key Algorithms & Core Process Flows'),

          createHeading2('6.1 Fractional LexoRank Reordering Algorithm'),
          createParagraph(
            'Traditional Kanban boards reorder cards by storing integer order indices (0, 1, 2, ...), requiring updating every subsequent card whenever an item is inserted. In contrast, this platform implements LexoRank fractional strings:'
          ),
          createBullet('Initial Rank: "0|h00000:" assigned to the first card.', 'Base Rank:'),
          createBullet('Midpoint Computation: When card B is moved between card A ("0|h00001:") and card C ("0|h00002:"), LexoRank calculates the exact string midpoint: "0|h00001i:".', 'Interpolation:'),
          createBullet('Single Database Write: Exactly one MongoDB document is updated (Issue.updateOne). Complexity is O(1) time and O(1) space!', 'Atomic Operation:'),

          createHeading2('6.2 Intelligent Dual-Metric Burndown Analytics Engine'),
          createParagraph(
            'In standard Scrum tooling, teams that do not estimate Fibonacci story points experience completely empty burndown charts. Our platform solves this with an intelligent dual-metric calculation engine:'
          ),
          createBullet('Story Points Mode: Calculates ideal burn and daily actual remaining points based on issue estimates.', 'Dual Unit Calculation:'),
          createBullet('Task Count Mode: Calculates ideal burn and daily actual remaining tasks based on completed count.', 'Fallback Support:'),
          createBullet('Auto-Detection: If a sprint has tasks but all story points equal 0, the system automatically defaults to Task Count mode so analytics are immediately live and meaningful.', 'Zero-Config UX:'),

          createHeading2('6.3 Automation Rule Execution Engine'),
          createParagraph(
            'Whenever an issue is created, modified, or transition events occur, the automationService evaluates active project rules:'
          ),
          createBullet('Trigger Matching: Detects triggers (STATUS_CHANGE, ISSUE_CREATED, ASSIGNEE_CHANGE).', '1. Trigger Match:'),
          createBullet('Condition Evaluation: Checks operators (EQUALS, NOT_EQUALS, CONTAINS) against fields.', '2. Condition Check:'),
          createBullet('Atomic Actions: Automatically re-assigns users, applies status transitions, adds comments, or alerts stakeholders.', '3. Action Dispatch:'),
          createBullet('Audit Record: Increments executionCount and logs the event to the activities collection.', '4. Execution Log:'),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 7: RBAC MATRIX
          createHeading1('7. Role-Based Access Control (RBAC) Matrix'),
          createParagraph(
            'The platform enforces strict security boundaries across both system-wide and workspace-level roles:'
          ),
          createStyledTable(
            ['System Capability', 'Admin', 'Project Manager', 'Employee', 'Guest'],
            [
              ['Manage Workspace Organization & Billing', 'FULL (Allowed)', 'DENIED', 'DENIED', 'DENIED'],
              ['Create, Edit & Delete Projects', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED', 'DENIED'],
              ['Configure Kanban Board Columns & WIP Limits', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED', 'DENIED'],
              ['Start & Complete Sprints (Rollover)', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED', 'DENIED'],
              ['Create Tasks, Bugs, and User Stories', 'FULL (Allowed)', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED (Read-Only)'],
              ['Assign Tasks to Other Team Members', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED (Self Only)', 'DENIED'],
              ['Drag Cards & Transition Issue Status', 'FULL (Allowed)', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED'],
              ['Comment on Issues & View Discussions', 'FULL (Allowed)', 'FULL (Allowed)', 'FULL (Allowed)', 'FULL (Allowed)'],
              ['Log Personal Work Hours (Timesheets)', 'FULL (Allowed)', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED'],
              ['Inspect All Team Members Timesheets', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED (Self Only)', 'DENIED'],
              ['Create & Configure No-Code Automations', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED', 'DENIED'],
              ['View Agile Delivery Reports & Burndown', 'FULL (Allowed)', 'FULL (Allowed)', 'DENIED', 'DENIED'],
            ],
            [35, 16, 17, 16, 16]
          ),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 8: FRONTEND WORKFLOWS
          createHeading1('8. Frontend Views & User Experience Workflows'),
          createParagraph('The client application features 9 high-productivity workspaces:'),
          createBullet('Interactive columns (Backlog, To Do, In Progress, Review, Testing, Done) with WIP limit alerts, quick issue add modal, and card priority badges.', '1. Kanban Board (/dash/board):'),
          createBullet('Sprint triage console where backlog items can be organized, estimated, and assigned into upcoming iterations.', '2. Backlog & Sprints (/dash/backlog):'),
          createBullet('High-density spreadsheet layout with multi-issue selection, bulk status/sprint updates, and fast keyboard navigation.', '3. List View (/dash/list):'),
          createBullet('Interactive Gantt chart showing milestone timelines, dependencies, and start-to-finish critical paths.', '4. Gantt Timeline (/dash/gantt):'),
          createBullet('Calendar schedule organizing issues by due dates and sprint boundaries.', '5. Calendar View (/dash/calendar):'),
          createBullet('Dual-metric Sprint Burndown, Velocity iteration tracking, Cumulative Flow Diagram, and Assignee Capacity charts.', '6. Reports & Analytics (/dash/reports):'),
          createBullet('Self-service time logger with weekly grids, role-isolated team summaries, and CSV report export.', '7. Timesheets (/dash/timesheets):'),
          createBullet('Visual trigger-condition-action workflow builder for automating repetitive software team processes.', '8. Automations (/dash/automations):'),
          createBullet('Multi-tenant member directory, email invitations, and RBAC role delegation console.', '9. Organization Members (/dash/workspace-members):'),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // SECTION 9: ENVIRONMENT & DEPLOYMENT
          createHeading1('9. Environment Configuration & Deployment Guide'),
          createParagraph('To run and deploy the application in production:'),

          createHeading2('9.1 Backend Environment Variables (server/.env)'),
          createStyledTable(
            ['Variable', 'Example Value', 'Description'],
            [
              ['PORT', '5001', 'HTTP port where Express and Socket.io server listen'],
              ['MONGODB_URI', 'mongodb+srv://.../taskmanager', 'MongoDB connection string (Atlas or self-hosted)'],
              ['SECRET_KEY', 'your_jwt_strong_secret_key', 'Cryptographic secret key for signing JWT tokens'],
              ['CLIENT_URL', 'http://localhost:5173', 'Allowed origin for CORS and cookie policies'],
              ['NODE_ENV', 'production', 'Environment runtime mode (development / production)'],
            ],
            [25, 35, 40]
          ),

          createHeading2('9.2 Frontend Environment Variables (client/.env)'),
          createStyledTable(
            ['Variable', 'Example Value', 'Description'],
            [
              ['VITE_API_URL', 'http://localhost:5001/api', 'Base URL for backend REST API v1 calls'],
              ['VITE_SOCKET_URL', 'http://localhost:5001', 'Base URL for Socket.io WebSocket connection'],
            ],
            [30, 35, 35]
          ),

          createHeading2('9.3 Production Build & Run Commands'),
          createParagraph('Execute the following commands in the workspace root:'),
          createBullet('Install server and client packages: cd server && npm install && cd ../client && npm install', '1. Dependencies:'),
          createBullet('Compile optimized frontend bundle: cd client && npm run build (Outputs to dist/)', '2. Frontend Build:'),
          createBullet('Launch Node production process: cd ../server && npm start (Listens on configured PORT)', '3. Backend Server:'),

          new Paragraph({ spacing: { before: 300, after: 100 } }),
          createCallout(
            'Documentation Maintenance Notice',
            'This document is maintained alongside the codebase under version control. For updates, regenerate via the project build script or review DOCUMENTATION.md in the repository root.'
          ),
        ],
      },
    ],
  });

  const docsDir = path.resolve('f:/Stuffs/task-manage/docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'Enterprise_Task_Manager_Documentation.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  console.log(`Document successfully generated at: ${outputPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

buildDoc().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
