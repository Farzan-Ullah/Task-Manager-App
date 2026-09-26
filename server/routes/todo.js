const express = require("express");
const router = express.Router();
const {
  addTodo,
  deleteTodo,
  getAllTodos,
  updateTodo,
  labelCreate,
  getParticularTodo,
  filterTodosByDate,
  analyticsData,
  updateCheck,
} = require("../controllers/todos/index");

const { verifyToken } = require("../middlewares/TokenVerification");

router.get("/", verifyToken, getAllTodos);
router.post("/addtodo", verifyToken, addTodo);
router.put("/update/:id", verifyToken, updateTodo);
router.delete("/delete/:id", verifyToken, deleteTodo);
router.put("/label/:id", verifyToken, labelCreate);
router.get("/particular/:id", verifyToken, getParticularTodo);
router.get("/filter/:filterType", verifyToken, filterTodosByDate);
router.get("/analytics/:filterType", verifyToken, analyticsData);
router.put("/checkupdate/:id", verifyToken, updateCheck);

module.exports = router;
