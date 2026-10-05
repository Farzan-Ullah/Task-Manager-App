# Pro Manage — Enterprise Project & Agile Workspace Platform

A high-performance, real-time Jira & Trello-style project management platform built on the MERN stack (MongoDB, Express, React, Node.js) with real-time Socket.IO collaboration, LexoRank drag-and-drop sequencing, sprint/backlog planning, time tracking, multi-perspective views, agile analytics, and an automation engine.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │        React 18 Single-Page App          │
                      │  (Vite + React Router + Tailwind + DnD)  │
                      └────────────────────┬─────────────────────┘
                                           │
                       REST API (HTTP)     │     Socket.IO (WebSocket)
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │          Node.js / Express Server        │
                      │ ──────────────────────────────────────── │
                      │  • JWT Auth & Dynamic RBAC               │
                      │  • LexoRank Ordering Algorithm           │
                      │  • Automation Rules Engine               │
                      │  • Real-Time Event Dispatcher            │
                      │  • Backward-Compatible Legacy Layer      │
                      └────────────────────┬─────────────────────┘
                                           │
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │          MongoDB Atlas Cluster           │
                      │  • Workspaces, Projects, Sprints         │
                      │  • Issues & Todos (Shared Collection)    │
                      │  • TimeLogs, Activities, Notifications   │
                      └──────────────────────────────────────────┘
```

---

## Key Features

### 1. Workspaces & Projects
- **Multi-Tenant Workspaces**: Multi-user workspace isolation with 6-character invite codes and member management.
- **Projects**: Project keys (e.g. `PROJ-101`), team leads, and project-level role-based access control (Admin, Project Manager, Member, Viewer).
- **Default Boards**: Every project automatically provisions a customized Kanban board.

### 2. LexoRank Kanban Board
- **Smooth Drag-and-Drop**: Powered by `@hello-pangea/dnd` with optimistic UI updates.
- **LexoRank Sequencing**: Midpoint string ranking algorithm eliminates O(N) re-indexing of sibling tasks on column or rank changes.
- **WIP Limits & Filters**: Configurable Work-in-Progress limits per column with real-time warning indicators, quick search, priority, assignee, and type filters.

### 3. Issue Detail View & Rich Text
- **Two-Column Jira Modal**: Description editor, subtask checklist, comments with `@mentions`, activity audit log, and file attachments.
- **Tiptap WYSIWYG Editor**: Headings, bullet points, blockquotes, code blocks, and rich formatting.
- **Hierarchical Subtasks**: Keyed subtask items (`PROJ-101-1`) with independent statuses and completion tracking.

### 4. Sprints & Backlog Planning
- **Backlog Management**: Dedicated planning view with collapsible sprint buckets and unassigned backlog pool.
- **Sprint Lifecycle**:
  - Create sprints with goals and date ranges.
  - Active sprint exclusivity (one active sprint at a time per project).
  - Sprint completion modal with automatic uncompleted issue rollover to next sprint or backlog.

### 5. Time Tracking & Timesheets
- **In-App Stopwatch Widget**: Floating/docked timer for active work tracking.
- **Manual Work Logs**: Record hours/minutes spent with descriptive notes.
- **Timesheets Dashboard**: Daily work distribution charts, team workload breakdown, and one-click CSV export.

### 6. Multiple Project Views
- **Kanban Board**: Drag-and-drop workflow columns.
- **List View**: Dense spreadsheet-style table with sortable columns, inline status/priority editing, and bulk selection (batch status updates & batch deletion).
- **Calendar View**: Month grid with deadline pills and instant task creation on date click.
- **Gantt View**: Timeline visualization showing task durations, dates, and an unscheduled drawer.
- **Smart Filter Presets**: "My Open Issues", "High Priority Bugs", "Current Sprint", and "Overdue Tasks".

### 7. Agile Reports & Analytics Dashboard
- **Burndown Chart**: Ideal burn vs actual burn line chart with real-time pace health indicators.
- **Velocity Chart**: Committed vs completed story points per sprint.
- **Cumulative Flow Diagram (CFD)**: Stacked area chart illustrating task progression across stages over time.
- **Workload Balance**: Member open vs completed task distribution and capacity indicators.

### 8. Automation Rules Engine & Notifications
- **Trigger-Condition-Action Architecture**:
  - *Triggers*: `STATUS_CHANGED`, `ISSUE_CREATED`, `ASSIGNEE_CHANGED`, `DUE_DATE_APPROACHING`.
  - *Actions*: `SET_STATUS`, `ASSIGN_USER`, `SEND_NOTIFICATION`, `ADD_COMMENT`, `SET_PRIORITY`.
- **Pre-Built Rule Templates**: 1-click install for common agile automations.
- **In-App Notification Center**: Popover with unread badges, real-time alerts, and direct navigation to issues.

### 9. 100% Backward Compatibility
- Complete backward compatibility preserved for all original endpoints:
  - `POST /api/todos/addtodo`
  - `GET /api/todos`
  - `PUT /api/todos/update/:id`
  - `DELETE /api/todos/delete/:id`
  - `GET /share/:id` (Public share link with fortified read-only rendering)
  - Legacy `User` and `Workspace` routes remain fully operational.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Tiptap, Recharts, @hello-pangea/dnd, Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO, Mongoose, JWT, Bcrypt, Multer, Zod |
| **Database** | MongoDB Atlas (Shared collection schema for Todos and Issues) |

---

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB Atlas connection URI

### Installation

1. Install root, server, and client dependencies:
   ```bash
   npm run install:all
   ```

2. Configure environment variables in `server/.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   SECRET_KEY=your_jwt_secret_key
   CLIENT_URL=http://localhost:5173
   ```

3. (Optional) Run the database migration script:
   ```bash
   cd server
   node scripts/migrate.js
   ```

4. Start both Server and Client concurrently:
   ```bash
   npm start
   ```
   - Client dev server: `http://localhost:5173`
   - Server API: `http://localhost:5000`

---

## Production Build

To build the client application for production:
```bash
npm run build
```
Compiled assets will be generated in `client/dist/`.
