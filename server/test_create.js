const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Todos = require("./models/todo");
const User = require("./models/user");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await User.findOne({ role: "Admin" });
  if (!admin) {
    console.log("No admin found");
    process.exit(1);
  }

  try {
    const newTodo = new Todos({
      title: "Test Task via Script",
      priority: "HIGH",
      label: "TO-DO",
      tasks: [{ title: "Checklist 1", completed: false }],
      user: admin._id,
      assignee: null,
    });
    await newTodo.save();
    console.log("Task created successfully:", newTodo._id);
  } catch (err) {
    console.error("Error creating task:", err);
  }
  process.exit(0);
}

check();
