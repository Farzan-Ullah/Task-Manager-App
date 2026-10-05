const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 100,
  },
});

/**
 * Atomically increments and gets the next sequence number for an issue in a project
 * @param {ObjectId} projectId
 * @returns {Promise<number>}
 */
counterSchema.statics.getNextSequence = async function (projectId) {
  const counter = await this.findOneAndUpdate(
    { projectId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
