const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Todos = require("./models/todo");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require("./models/user");
  const users = await User.find({});
  console.log("Users:", users.map(u => ({ email: u.email, role: u.role })));
  process.exit(0);
}

check();
