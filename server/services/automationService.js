const { Automation, Issue, Project } = require("../models");
const notificationService = require("./notificationService");
const socketService = require("./socketService");

/**
 * Workflow automation execution engine
 */
class AutomationService {
  /**
   * Run automations matching a trigger
   * @param {string} triggerType - "STATUS_CHANGED", "PRIORITY_CHANGED", "ISSUE_CREATED", "SPRINT_STARTED"
   * @param {Object} context
   * @param {ObjectId} context.projectId
   * @param {Object} [context.issue] - Current issue document
   * @param {Object} [context.previousIssue] - Previous state before mutation
   * @param {Object} [context.sprint] - Sprint document if sprint event
   * @param {ObjectId} [context.actorId] - User initiating the action
   */
  async triggerAutomations(triggerType, context) {
    try {
      const { projectId, issue, sprint, actorId } = context;
      if (!projectId) return;

      const automations = await Automation.find({
        projectId,
        "trigger.type": triggerType,
        enabled: true,
      });

      if (!automations || automations.length === 0) return;

      for (const auto of automations) {
        const matches = this.evaluateConditions(auto.conditions, context);
        if (matches) {
          console.log(`Executing automation "${auto.name}" (${auto._id})`);
          await this.executeActions(auto.actions, context, auto.name);
        }
      }
    } catch (error) {
      console.error("Error executing automations:", error.message);
    }
  }

  /**
   * Evaluate conditions against context
   * @param {Array} conditions
   * @param {Object} context
   * @returns {boolean}
   */
  evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true;

    const { issue, sprint } = context;
    const targetObj = issue || sprint;
    if (!targetObj) return false;

    return conditions.every((cond) => {
      const actualValue = targetObj[cond.field];
      const expectedValue = cond.value;

      switch (cond.operator) {
        case "equals":
          return String(actualValue) === String(expectedValue);
        case "not_equals":
          return String(actualValue) !== String(expectedValue);
        case "contains":
          if (Array.isArray(actualValue)) {
            return actualValue.includes(expectedValue);
          }
          return String(actualValue || "").toLowerCase().includes(String(expectedValue).toLowerCase());
        case "in":
          return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
        default:
          return true;
      }
    });
  }

  /**
   * Execute actions of a matched automation rule
   * @param {Array} actions
   * @param {Object} context
   * @param {string} automationName
   */
  async executeActions(actions, context, automationName) {
    const { projectId, issue, sprint, actorId } = context;
    const project = await Project.findById(projectId);

    for (const act of actions) {
      const { type, config = {} } = act;

      switch (type) {
        case "NOTIFY_USER": {
          let recipientId = null;
          if (config.target === "reporter" && issue?.reporterId) {
            recipientId = issue.reporterId;
          } else if (config.target === "assignee" && issue?.assigneeId) {
            recipientId = issue.assigneeId;
          } else if (config.target === "lead" && project?.leadId) {
            recipientId = project.leadId;
          } else if (config.userId) {
            recipientId = config.userId;
          }

          if (recipientId) {
            await notificationService.createNotification({
              userId: recipientId,
              type: "AUTOMATION",
              title: `Automation: ${automationName}`,
              message: config.message || `Rule triggered on issue ${issue?.key || ""}`,
              payload: {
                projectId,
                issueId: issue?._id,
                issueKey: issue?.key,
                senderId: actorId,
              },
            });
          }
          break;
        }

        case "NOTIFY_ROLE": {
          if (project && config.role) {
            await notificationService.notifyRole(project, config.role, {
              type: "AUTOMATION",
              title: `Automation: ${automationName}`,
              message: config.message || `Rule triggered for role ${config.role} on ${issue?.key || project.name}`,
              payload: {
                projectId,
                issueId: issue?._id,
                issueKey: issue?.key,
                senderId: actorId,
              },
            });
          }
          break;
        }

        case "ASSIGN_USER": {
          if (issue && config.assigneeId) {
            await Issue.findByIdAndUpdate(issue._id, {
              assigneeId: config.assigneeId,
              assignee: config.assigneeId,
            });
            socketService.emitToProject(projectId, "issue.updated", {
              _id: issue._id,
              key: issue.key,
              assigneeId: config.assigneeId,
            });
          } else if (issue && config.target === "lead" && project?.leadId) {
            await Issue.findByIdAndUpdate(issue._id, {
              assigneeId: project.leadId,
              assignee: project.leadId,
            });
            socketService.emitToProject(projectId, "issue.updated", {
              _id: issue._id,
              key: issue.key,
              assigneeId: project.leadId,
            });
          }
          break;
        }

        case "SET_STATUS": {
          if (issue && config.status) {
            await Issue.findByIdAndUpdate(issue._id, {
              status: config.status,
              label: config.status === "Done" ? "DONE" : config.status === "In Progress" ? "PROGRESS" : "TO-DO",
            });
            socketService.emitToProject(projectId, "issue.updated", {
              _id: issue._id,
              key: issue.key,
              status: config.status,
            });
          }
          break;
        }

        case "SET_PRIORITY": {
          if (issue && config.priority) {
            await Issue.findByIdAndUpdate(issue._id, {
              priority: config.priority,
            });
            socketService.emitToProject(projectId, "issue.updated", {
              _id: issue._id,
              key: issue.key,
              priority: config.priority,
            });
          }
          break;
        }

        default:
          console.warn(`Unknown automation action type: ${type}`);
      }
    }
  }
}

module.exports = new AutomationService();
