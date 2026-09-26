const mongoose = require("mongoose");
async function check() {
  try {
    const uri = "mongodb+srv://admin:admin@task-manager-app.7nuuow5.mongodb.net/task-app?retryWrites=true&w=majority&appName=Task-Manager-app";
    await mongoose.connect(uri);
    console.log("Connected to Atlas DB");
    const User = require("./models/user");
    const Todos = require("./models/todo");
    console.log("Users in Atlas:", await User.countDocuments());
    console.log("Todos in Atlas:", await Todos.countDocuments());
    process.exit(0);
  } catch (err) {
    console.error("Failed to connect:", err);
    process.exit(1);
  }
}
check();
