const { Automation } = require("../../models");

/**
 * Create automation rule
 */
const createAutomation = async (req, res, next) => {
  try {
    const { projectId, name, trigger, conditions = [], actions = [], enabled = true } = req.body;

    if (!projectId || !name || !trigger || !trigger.type) {
      return res.status(400).json({
        success: false,
        message: "Project ID, rule name, and trigger type are required",
      });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one action is required",
      });
    }

    const automation = new Automation({
      projectId,
      name: name.trim(),
      trigger,
      conditions,
      actions,
      enabled,
    });

    await automation.save();

    res.status(201).json({
      success: true,
      message: `Automation "${automation.name}" created successfully`,
      automation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get automations for a project
 */
const getAutomations = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const automations = await Automation.find({ projectId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      automations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update automation rule
 */
const updateAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, trigger, conditions, actions, enabled } = req.body;

    const automation = await Automation.findById(id);
    if (!automation) {
      return res.status(404).json({ success: false, message: "Automation rule not found" });
    }

    if (name) automation.name = name.trim();
    if (trigger) automation.trigger = trigger;
    if (conditions !== undefined) automation.conditions = conditions;
    if (actions !== undefined) automation.actions = actions;
    if (enabled !== undefined) automation.enabled = enabled;

    await automation.save();

    res.status(200).json({
      success: true,
      message: "Automation rule updated",
      automation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete automation rule
 */
const deleteAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const automation = await Automation.findByIdAndDelete(id);
    if (!automation) {
      return res.status(404).json({ success: false, message: "Automation rule not found" });
    }

    res.status(200).json({
      success: true,
      message: "Automation rule deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAutomation,
  getAutomations,
  updateAutomation,
  deleteAutomation,
};
