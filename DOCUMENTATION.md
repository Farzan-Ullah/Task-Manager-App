# Enterprise Task Manager & Agile Delivery Platform
## Comprehensive Technical & Architecture Documentation

---

## 1. Executive Summary & Architecture Overview

The **Enterprise Task Manager Platform** is an enterprise-grade Agile Project Management and Issue Tracking system built with a modern full-stack JavaScript architecture. Inspired by industry standards like Jira, Linear, and Asana, it provides organizations with end-to-end tooling for sprint planning, interactive Kanban workflows, timeline dependencies, team time tracking, automated workflow execution, and real-time sprint delivery analytics.

### High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|  React 18 + Vite | Tailwind CSS | Recharts | Socket.io-client | Lucide Icons      |
|                                                                                   |
|  [ Kanban Board ]   [ Backlog & Sprints ]   [ Gantt & Calendar ]   [ Timesheets ] |
|  [ Reports/CFD ]    [ Automations Engine ]  [ Organization & RBAC Settings ]     |
+-----------------------------------------+-----------------------------------------+
                                          |
                      HTTPS REST API (Axios) / WSS Real-Time
                                          |
+-----------------------------------------v-----------------------------------------+
|                                  SERVER TIER                                      |
|  Node.js + Express REST API (v1) | Socket.io Server | JWT Auth | RBAC Guards      |
|                                                                                   |
|  /auth         /workspaces     /projects     /boards       /issues                |
|  /sprints      /time-logs      /reports      /automations  /notifications         |
+--------------------+------------------------------------+-------------------------+
                     |                                    |
      Mongoose ODM Indexes & Aggregations       Socket Room Broadcasting
                     |                                    |
+--------------------v-------------+             +--------v-------------------------+
|           DATA TIER              |             |         SOCKET ROOMS             |
|  MongoDB Database Engine         |             |  project_{id} | workspace_{id}   |
|  13 Production Collections       |             |  Real-time broadcast pipeline    |
+----------------------------------+             +----------------------------------+
```

### Monorepo Structure

```
task-manage/
├── client/                     # Frontend Single Page Application (SPA)
│   ├── public/                 # Static assets and icons
│   ├── src/
│   │   ├── assets/             # Brand logos and images
│   │   ├── components/         # Modular reusable components
│   │   │   ├── board/          # Kanban cards, columns, swimlanes
│   │   │   ├── common/         # Modals, Navbar, Workspace switcher
│   │   │   ├── issues/         # Create/Edit issue modals, details
│   │   │   ├── reports/        # Burndown, Velocity, CFD, Workload tabs
│   │   │   ├── timer/          # Work timer components
│   │   │   └── timesheets/     # Weekly timesheet tables & logs
│   │   ├── context/            # React AppContext (Auth, Workspace, Theme)
│   │   ├── pages/              # Primary route views (Board, Backlog, Reports, etc.)
│   │   └── utils/              # Axios instance with interceptors, helpers
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API & WebSocket Engine
│   ├── controllers/v1/         # Business logic handlers
│   ├── middlewares/            # Token verification, RBAC, Multer uploads
│   ├── models/                 # Mongoose schemas & indexes
│   ├── routes/v1/              # Versioned API routes
│   ├── services/               # Automation, socket, notification services
│   ├── utils/                  # LexoRank algorithm, date helpers
│   ├── server.js               # Entrypoint & HTTP/Socket server bootstrap
│   └── package.json
│
└── docs/                       # Project documentation artifacts & Word docs
```

---

## 2. Technology Stack Breakdown

### Frontend Technologies
| Component | Technology | Version / Spec | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `^18.2.0` | Declarative component UI engine |
| **Build Tool** | Vite | `^8.3.x` | Lightning-fast HMR and optimized production bundling |
| **Styling** | Tailwind CSS | `^3.4.x` | Modern utility-first CSS with dark/light themes |
| **Icons** | Lucide React | Latest | Clean, consistent SVG iconography |
| **Charting Engine**| Recharts | `^2.12.x` | SVG-based responsive data visualization |
| **Realtime** | Socket.io Client | `^4.7.x` | Bi-directional WebSocket communication |
| **Routing** | React Router DOM | `^6.22.x` | Client-side routing and protected paths |
| **HTTP Client** | Axios | `^1.6.x` | Promise-based HTTP client with request interceptors |
| **Drag & Drop** | Custom HTML5 DnD | Modern DnD | Performant Kanban card & sprint backlog ordering |

### Backend Technologies
| Component | Technology | Version / Spec | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `v20.x / v24.x` | Asynchronous JavaScript runtime |
| **Web Framework**| Express.js | `^4.18.x` | RESTful API server routing and middleware pipeline |
| **Database ODM** | Mongoose | `^8.2.x` | Schema validation, hooks, indexing, queries |
| **Database** | MongoDB | `^6.0+ / Atlas` | High-throughput document data store |
| **Realtime** | Socket.io | `^4.7.x` | WebSocket room pub/sub for instant sync |
| **Authentication**| JSON Web Tokens | `^9.0.x` | Stateless bearer token authentication |
| **Security** | BcryptJS & Helmet | `^2.4.x` | Salted password hashing & secure HTTP headers |
| **Ordering** | LexoRank Algorithm | Custom $O(1)$ | Fractional rank strings for instant card reordering |
| **File Storage** | Multer | `^1.4.x` | Multipart attachment uploads |
| **Date Engine** | Moment.js | `^2.30.x` | Timezone normalization & sprint timeline calculation |

---

## 3. Database Architecture & Data Models

The system employs **13 interrelated collections** in MongoDB, engineered with unique indexes and virtual fields.

### Key Data Models

#### 1. `Workspace` (`server/models/workspace.js`)
Multi-tenant container isolating organizations.
```javascript
{
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  owner: { type: ObjectId, ref: "User", required: true },
  members: [{
    userId: { type: ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["Workspace Admin", "Project Manager", "Member"], default: "Member" },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["ACTIVE", "INVITED", "SUSPENDED"], default: "ACTIVE" }
  }],
  avatar: { type: String, default: "" }
}
```

#### 2. `Project` (`server/models/project.js`)
Group of boards, sprints, and issues within a workspace.
```javascript
{
  workspaceId: { type: ObjectId, ref: "Workspace", required: true, index: true },
  name: { type: String, required: true },
  key: { type: String, required: true, uppercase: true }, // e.g. "PROJ", "TECH"
  description: { type: String, default: "" },
  leadId: { type: ObjectId, ref: "User" },
  members: [{
    userId: { type: ObjectId, ref: "User" },
    role: { type: String, enum: ["Project Manager", "Member", "Viewer"], default: "Member" }
  }]
}
```

#### 3. `Issue` (`server/models/issue.js`)
Core deliverable unit (Tasks, Stories, Bugs).
```javascript
{
  projectId: { type: ObjectId, ref: "Project", required: true, index: true },
  workspace: { type: ObjectId, ref: "Workspace", index: true },
  key: { type: String, index: true }, // e.g. "PROJ-101"
  type: { type: String, enum: ["Task", "Bug", "Story", "Issue", "Request"], default: "Task" },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  status: { type: String, default: "To Do", index: true },
  priority: { type: String, enum: ["Highest", "High", "Medium", "Low", "Lowest"], default: "Medium" },
  assigneeId: { type: ObjectId, ref: "User", index: true },
  reporterId: { type: ObjectId, ref: "User", index: true },
  sprintId: { type: ObjectId, ref: "Sprint", default: null, index: true },
  rank: { type: String, default: "0|h00000:", index: true }, // LexoRank string
  estimate: { type: Number, default: 0 }, // Story Points (Fibonacci)
  parentId: { type: ObjectId, ref: "Issue", default: null }, // Hierarchical Subtasks
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  attachments: [{ name: String, url: String, size: Number, mimeType: String }],
  pullRequests: [{ title: String, prNumber: Number, url: String, status: String }]
}
```

#### 4. `Sprint` (`server/models/sprint.js`)
Iteration boundary for Scrum projects.
```javascript
{
  projectId: { type: ObjectId, ref: "Project", required: true, index: true },
  name: { type: String, required: true },
  goal: { type: String, default: "" },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ["PLANNED", "ACTIVE", "COMPLETED"], default: "PLANNED" },
  committedPoints: { type: Number, default: 0 }
}
```

#### 5. `TimeLog` (`server/models/timeLog.js`)
Timesheet records linked to issues.
```javascript
{
  issueId: { type: ObjectId, ref: "Issue", required: true, index: true },
  userId: { type: ObjectId, ref: "User", required: true, index: true },
  projectId: { type: ObjectId, ref: "Project", required: true, index: true },
  duration: { type: Number, required: true }, // in minutes
  date: { type: Date, default: Date.now, index: true },
  description: { type: String, default: "" }
}
```

#### 6. `Automation` (`server/models/automation.js`)
Rule engine models.
```javascript
{
  projectId: { type: ObjectId, ref: "Project", required: true, index: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  trigger: {
    type: { type: String, enum: ["STATUS_CHANGE", "ISSUE_CREATED", "ASSIGNEE_CHANGE", "PR_OPENED"] },
    config: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  conditions: [{
    field: { type: String, required: true },
    operator: { type: String, enum: ["EQUALS", "NOT_EQUALS", "CONTAINS"], default: "EQUALS" },
    value: { type: mongoose.Schema.Types.Mixed }
  }],
  actions: [{
    type: { type: String, enum: ["UPDATE_STATUS", "ASSIGN_USER", "ADD_COMMENT", "SEND_NOTIFICATION"] },
    config: { type: Map, of: mongoose.Schema.Types.Mixed }
  }],
  executionCount: { type: Number, default: 0 }
}
```

---

## 4. End-to-End REST API Reference

All requests must supply the header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Endpoints (`/api/v1/auth`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new user account with initial workspace |
| `POST` | `/api/v1/auth/login` | Public | Authenticate credentials and return JWT & cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current authenticated user profile & roles (also `/api/user/me`) |
| `POST` | `/api/v1/auth/logout` | Public | Invalidate authentication session cookie |
| `POST` | `/api/v1/auth/forgot-password`| Public | Generate and email password reset token |
| `POST` | `/api/v1/auth/reset-password/:token`| Public | Reset user password via verification token |
| `PUT` | `/api/v1/auth/update/:userId` | Authenticated | Update user profile, name, avatar |
| `GET` | `/api/v1/auth/allUsers` | Authenticated | List all active users for mention/assignment |

### Workspace Management (`/api/v1/workspaces`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces` | Authenticated | Get all workspaces the authenticated user belongs to |
| `POST` | `/api/v1/workspaces` | Authenticated | Create a new tenant workspace |
| `GET` | `/api/v1/workspaces/:id` | Member | Get workspace details and projects |
| `PATCH`| `/api/v1/workspaces/:id` | Workspace Admin | Update workspace configuration and name |
| `POST` | `/api/v1/workspaces/:id/invite` | Workspace Admin | Invite team member via email |
| `DELETE`| `/api/v1/workspaces/:id/members/:userId`| Workspace Admin | Remove user membership from workspace |
| `POST` | `/api/v1/workspaces/:id/switch` | Member | Switch current active workspace context |

### Projects & Boards (`/api/v1/projects` & `/api/v1/boards`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects?workspaceId=...` | Member | List projects in workspace |
| `POST` | `/api/v1/projects` | Admin / PM | Create new project with key prefix |
| `GET` | `/api/v1/projects/:id` | Member | Get project details, members, and metadata |
| `PATCH`| `/api/v1/projects/:id` | Project Manager | Update project settings, name, description |
| `GET` | `/api/v1/projects/:id/board` | Member | Get active Kanban board structure & columns |
| `PATCH`| `/api/v1/boards/:id/columns` | Project Manager | Update columns order and WIP limits |

### Issue Tracking & Lifecycle (`/api/v1/issues`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/issues?projectId=...` | Member | Fetch and filter issues (sprint, assignee, status) |
| `POST` | `/api/v1/issues` | Member / PM | Create issue with auto-generated sequential key |
| `GET` | `/api/v1/issues/:id` | Member | Get single issue details, subtasks, attachments |
| `PATCH`| `/api/v1/issues/:id` | Member | Update title, description, priority, points |
| `PATCH`| `/api/v1/issues/:id/move` | Member | Move card between columns/rank with LexoRank |
| `POST` | `/api/v1/issues/bulk/update` | Project Manager | Bulk update status, sprint, or assignee |
| `DELETE`| `/api/v1/issues/:id` | Project Manager | Delete issue and remove associated logs |
| `POST` | `/api/v1/issues/:id/attachments`| Member | Upload document/image attachment |
| `POST` | `/api/v1/issues/:id/pull-requests`| Member | Attach GitHub / GitLab pull request to issue |

### Sprints & Agile Iterations (`/api/v1/sprints`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sprints?projectId=...` | Member | Get all planned, active, and completed sprints |
| `POST` | `/api/v1/sprints` | Project Manager | Create planned sprint |
| `POST` | `/api/v1/sprints/:id/start` | Project Manager | Start sprint, snapshot committed story points |
| `POST` | `/api/v1/sprints/:id/complete`| Project Manager | Complete sprint, rollover unfinished tasks |
| `DELETE`| `/api/v1/sprints/:id` | Project Manager | Delete sprint and return tasks to backlog |

### Delivery Reports & Analytics (`/api/v1/reports`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/burndown?sprintId=...` | PM / Admin | Daily Ideal vs. Actual story points and task burn |
| `GET` | `/api/v1/reports/velocity?projectId=...` | PM / Admin | Historical committed vs completed points bar stats |
| `GET` | `/api/v1/reports/cumulative-flow` | PM / Admin | Daily issue distribution across statuses (CFD) |
| `GET` | `/api/v1/reports/workload?projectId=...` | PM / Admin | Assignee capacity and task distribution |
| `GET` | `/api/v1/reports/summary?projectId=...` | PM / Admin | KPI cards (total, completed, overdue, points) |

### Timesheets & Time Tracking (`/api/v1/time-logs`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/time-logs` | Isolated | Non-managers view only self logs; Managers view all |
| `POST` | `/api/v1/time-logs` | Member | Log hours/minutes worked against an issue key |
| `GET` | `/api/v1/time-logs/summary` | Authenticated | Weekly/monthly aggregation with hours summary |
| `DELETE`| `/api/v1/time-logs/:id` | Owner / PM | Delete logged time entry |

### Automations (`/api/v1/automations`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/automations?projectId=...` | Project Manager | List automation rules and run metrics |
| `POST` | `/api/v1/automations` | Project Manager | Create new trigger-condition-action rule |
| `PATCH`| `/api/v1/automations/:id` | Project Manager | Toggle active status or update rule logic |
| `DELETE`| `/api/v1/automations/:id` | Project Manager | Delete automation rule |

---

## 5. Core Process Flows & Business Logic

### 1. Sequential Key Generation Flow
```
User clicks "Create Issue"
           │
           ▼
Check if Issue is Subtask (has parentId)?
  ├── YES: Key = `${parent.key}-${subtaskCount + 1}` (e.g. PROJ-101-1)
  └── NO:  Atomic MongoDB Counter.getNextSequence(projectId)
           Key = `${project.key}-${sequenceNumber}` (e.g. PROJ-102)
```

### 2. LexoRank Card Reordering Flow
```
Drag Issue "B" between Issue "A" (rank "0|h00001:") and Issue "C" (rank "0|h00002:")
                                   │
                                   ▼
LexoRank Algorithm calculates middle fractional string between A and C:
rank = between("0|h00001:", "0|h00002:") === "0|h00001i:"
                                   │
                                   ▼
Atomic update on single issue: Issue.updateOne({ _id: B }, { rank, status })
No full-column re-indexing required -> O(1) performance!
```

### 3. Sprint Lifecycle & Rollover Flow
```
1. PLANNED SPRINT
   • Issues dragged from Backlog into Sprint
   • Points sum up in real-time
                 │
                 ▼
2. START SPRINT
   • Status -> "ACTIVE"
   • Committed Points locked = Sum(issue.estimate)
   • WebSocket emits "sprint.started" to project members
                 │
                 ▼
3. COMPLETE SPRINT
   • Status -> "COMPLETED"
   • System checks unfinished issues (status !== "Done")
   • Prompt User: Rollover to "Backlog" OR "Next Sprint"?
   • Target issues updated atomically
   • Velocity stats updated
```

### 4. Burndown Chart Calculation Flow
```
Calculate Burndown for Sprint (start: Day 0, end: Day 14)
                 │
                 ▼
Ideal Step = Total Committed Points / Total Days
Ideal Points (Day d) = Total Points - (d * Ideal Step)
                 │
                 ▼
For each day (Day 0 to Today):
  Done Points After Day = Issues completed after Day d
  Open Points = Issues currently not Done
  Actual Points (Day d) = Open Points + Done Points After Day
                 │
                 ▼
If Sprint has NO story points (all 0 pts):
  Auto-fallback to Task Count burndown (idealIssues vs actualIssues)
```

---

## 6. Role-Based Access Control (RBAC) Matrix

| Feature / Action | Admin | Project Manager | Employee | Guest |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Workspaces & Billing** | ✅ | ❌ | ❌ | ❌ |
| **Create & Delete Projects** | ✅ | ✅ | ❌ | ❌ |
| **Configure Board Columns & WIP** | ✅ | ✅ | ❌ | ❌ |
| **Start & Complete Sprints** | ✅ | ✅ | ❌ | ❌ |
| **Create Tasks & Bugs** | ✅ | ✅ | ✅ | ❌ |
| **Assign Tasks to Other Members**| ✅ | ✅ | ❌ (Self only) | ❌ |
| **Move Kanban Cards & Update Status**| ✅ | ✅ | ✅ | ❌ |
| **Comment on Issues** | ✅ | ✅ | ✅ | ✅ |
| **View Own Timesheets** | ✅ | ✅ | ✅ | ❌ |
| **View All Team Timesheets** | ✅ | ✅ | ❌ | ❌ |
| **Configure Automations Engine** | ✅ | ✅ | ❌ | ❌ |
| **View Agile Reports & Delivery Analytics**| ✅ | ✅ | ❌ | ❌ |

---

## 7. Real-Time WebSocket Architecture

The platform uses **Socket.io** with room-based multiplexing:

| Socket Room | Broadcast Events | Purpose |
| :--- | :--- | :--- |
| `project_${projectId}` | `issue.created`, `issue.updated`, `issue.moved`, `issue.deleted` | Instant card updates across all open boards |
| `project_${projectId}` | `sprint.started`, `sprint.completed`, `sprint.updated` | Live sprint state transitions |
| `workspace_${workspaceId}` | `member.invited`, `member.removed`, `project.created` | Multi-user org updates |
| `user_${userId}` | `notification.new`, `mention.received` | Direct push notifications to active sessions |

---

## 8. Deployment & Environment Configuration

### Server Environment Variables (`server/.env`)
```env
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/taskmanager?retryWrites=true&w=majority
SECRET_KEY=your_secure_jwt_random_secret_string_here
CLIENT_URL=http://localhost:5173
NODE_ENV=production
```

### Client Environment Variables (`client/.env`)
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

### Production Setup Instructions

1. **Clone & Dependencies:**
   ```bash
   git clone https://github.com/Farzan-Ullah/Task-Manager-App.git
   cd Task-Manager-App
   cd server && npm install
   cd ../client && npm install
   ```

2. **Build Client:**
   ```bash
   cd client
   npm run build
   # Outputs optimized production build to dist/
   ```

3. **Start Backend Server:**
   ```bash
   cd ../server
   npm start
   # Server listens on PORT 5001
   ```

---

*Documentation generated for Task Manager App.*
