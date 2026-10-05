/**
 * Migration & Initialization Script
 * Safely inspects and migrates existing Atlas records:
 * - Ensures workspaces exist with members and roles
 * - Links users to workspaces
 * - Creates default Project ("Main Project", key "PROJ") with default Kanban board
 * - Upgrades existing Todos with Project association, issue keys (PROJ-101..), normalized status, and LexoRank positions
 * - Idempotent: safe to run multiple times without duplicating or corrupting data.
 */

const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const {
  User,
  Workspace,
  Project,
  Board,
  Issue,
  Counter,
  Automation,
} = require("../models");
const { initialRank } = require("../utils/lexorank");

async function runMigration() {
  console.log("--------------------------------------------------");
  console.log("Starting Database Schema Migration & Upgrade...");
  console.log("--------------------------------------------------");

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas successfully.");

    // 1. Inspect Users
    const users = await User.find({});
    console.log(`Found ${users.length} user(s) in database.`);

    if (users.length === 0) {
      console.log("No users found. Creating initial admin user...");
      // Nothing to migrate if no users exist
    }

    // 2. Identify or create Workspace
    let adminUser = users.find((u) => u.role === "Admin") || users[0];
    let workspace = await Workspace.findOne({});

    if (!workspace && adminUser) {
      console.log(`Creating default workspace for Admin user: ${adminUser.name} (${adminUser.email})...`);
      const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      workspace = new Workspace({
        name: `${adminUser.name}'s Workspace`,
        owner: adminUser._id,
        inviteCode,
        members: [
          {
            userId: adminUser._id,
            role: "Workspace Admin",
            status: "ACTIVE",
          },
        ],
      });
      await workspace.save();
      console.log(`Created Workspace "${workspace.name}" with ID: ${workspace._id}`);
    } else if (workspace) {
      console.log(`Found existing Workspace "${workspace.name}" (${workspace._id}).`);
      // Ensure owner is in members array
      const hasOwner = workspace.members.some(
        (m) => m.userId.toString() === workspace.owner.toString()
      );
      if (!hasOwner) {
        workspace.members.push({
          userId: workspace.owner,
          role: "Workspace Admin",
          status: "ACTIVE",
        });
        await workspace.save();
      }
    }

    // 3. Ensure all users are linked to workspace
    if (workspace) {
      for (const u of users) {
        let modified = false;
        if (!u.workspace || u.workspace.toString() !== workspace._id.toString()) {
          u.workspace = workspace._id;
          modified = true;
        }

        const roleInWksp = u.role === "Admin" ? "Workspace Admin" : "Member";
        if (!u.workspaces || u.workspaces.length === 0) {
          u.workspaces = [{ workspaceId: workspace._id, role: roleInWksp }];
          modified = true;
        }

        if (modified) {
          await u.save();
          console.log(`Updated user ${u.email} with workspace link.`);
        }

        // Ensure user is in workspace.members
        const isMember = workspace.members.some(
          (m) => m.userId.toString() === u._id.toString()
        );
        if (!isMember) {
          workspace.members.push({
            userId: u._id,
            role: roleInWksp,
            status: "ACTIVE",
          });
          await workspace.save();
          console.log(`Added user ${u.email} to workspace members list.`);
        }
      }
    }

    // 4. Ensure default Project exists
    let project = await Project.findOne({ workspaceId: workspace._id });
    if (!project) {
      console.log("No project found in workspace. Creating default Project...");
      project = new Project({
        workspaceId: workspace._id,
        key: "PROJ",
        name: "Main Project",
        description: "Primary workspace project upgraded to modern Jira/Trello architecture",
        leadId: workspace.owner,
        members: workspace.members.map((m) => ({
          userId: m.userId,
          role: m.role === "Workspace Admin" ? "Project Manager" : "Member",
        })),
        settings: {
          issueTypes: ["Task", "Bug", "Story"],
          priorities: ["Highest", "High", "Medium", "Low", "Lowest"],
        },
      });
      await project.save();
      console.log(`Created Project "${project.name}" (Key: ${project.key}) with ID: ${project._id}`);
    } else {
      console.log(`Found existing Project "${project.name}" (Key: ${project.key}).`);
    }

    // 5. Ensure Kanban Board exists for project
    let board = await Board.findOne({ projectId: project._id });
    if (!board) {
      console.log("Creating default Kanban board for project...");
      board = new Board({
        projectId: project._id,
        name: "Kanban Board",
        columns: [
          { id: "backlog", name: "Backlog", wipLimit: 0, statusMap: "Backlog", order: 0 },
          { id: "todo", name: "To Do", wipLimit: 0, statusMap: "To Do", order: 1 },
          { id: "in-progress", name: "In Progress", wipLimit: 5, statusMap: "In Progress", order: 2 },
          { id: "review", name: "Review", wipLimit: 3, statusMap: "Review", order: 3 },
          { id: "testing", name: "Testing", wipLimit: 3, statusMap: "Testing", order: 4 },
          { id: "done", name: "Done", wipLimit: 0, statusMap: "Done", order: 5 },
        ],
      });
      await board.save();
      console.log(`Created default Board "${board.name}" with 6 columns.`);
    } else {
      console.log(`Found existing Board "${board.name}" with ${board.columns.length} columns.`);
    }

    // 6. Migrate existing Todos / Issues
    const rawTodos = await mongoose.connection.collection("todos").find({}).toArray();
    console.log(`Inspecting ${rawTodos.length} issue(s)/todo(s) for migration...`);

    let seqCounter = 100;
    const counterDoc = await Counter.findOne({ projectId: project._id });
    if (counterDoc) {
      seqCounter = counterDoc.seq;
    }

    const LABEL_TO_STATUS = {
      "BACKLOG": "Backlog",
      "TO-DO": "To Do",
      "PROGRESS": "In Progress",
      "DONE": "Done",
    };

    let migratedCount = 0;
    for (let i = 0; i < rawTodos.length; i++) {
      const todo = rawTodos[i];
      const updates = {};

      if (!todo.workspace) {
        updates.workspace = workspace._id;
      }
      if (!todo.projectId) {
        updates.projectId = project._id;
      }
      if (!todo.key) {
        seqCounter++;
        updates.key = `${project.key}-${seqCounter}`;
      }
      if (!todo.type) {
        updates.type = "Task";
      }
      if (!todo.status) {
        updates.status = LABEL_TO_STATUS[todo.label] || "To Do";
      }
      if (!todo.rank) {
        updates.rank = initialRank(i);
      }
      if (!todo.reporterId && todo.user) {
        updates.reporterId = todo.user;
      }
      if (!todo.assigneeId && todo.assignee) {
        updates.assigneeId = todo.assignee;
      }
      if (!todo.dueDate && todo.date) {
        updates.dueDate = todo.date;
      }

      // Priority normalization
      if (todo.priority === "HIGH") updates.priority = "High";
      if (todo.priority === "MODERATE") updates.priority = "Medium";
      if (todo.priority === "LOW") updates.priority = "Low";

      if (Object.keys(updates).length > 0) {
        await mongoose.connection.collection("todos").updateOne(
          { _id: todo._id },
          { $set: updates }
        );
        migratedCount++;
      }
    }

    // Update Counter sequence
    await Counter.findOneAndUpdate(
      { projectId: project._id },
      { $set: { seq: seqCounter } },
      { upsert: true, new: true }
    );
    console.log(`Migrated ${migratedCount} issue(s). Updated sequence counter to ${seqCounter}.`);

    // 7. Ensure default Automation exists
    const existingAuto = await Automation.findOne({ projectId: project._id });
    if (!existingAuto) {
      const sampleAutomation = new Automation({
        projectId: project._id,
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
            config: { target: "reporter", message: "Your issue has been marked as Done." },
          },
        ],
        enabled: true,
      });
      await sampleAutomation.save();
      console.log("Created initial automation rule: Auto-notify reporter on Done.");
    }

    console.log("--------------------------------------------------");
    console.log("MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
