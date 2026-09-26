const express = require("express");
const userRoutes = require("./routes/user");
const todoRoutes = require("./routes/todo");
const { verifyToken } = require("./middlewares/TokenVerification");
const ShareTodo = require("./controllers/todos/TodoShare");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
require("./config/db");

dotenv.config();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT;

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World!" });
});

app.use("/api/user", userRoutes);
app.use("/api/todos", verifyToken, todoRoutes);
app.use("/share/:id", ShareTodo);

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
