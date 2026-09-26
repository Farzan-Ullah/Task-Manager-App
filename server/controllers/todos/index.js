const addTodo = require("./TodoAdd");
const deleteTodo = require("./TodoDelete");
const getAllTodos = require("./TodoAll");
const updateTodo = require("./TodoUpdate");
const labelCreate = require("./TodoLabelCreate");
const getParticularTodo = require("./TodoParticular");
const filterTodosByDate = require("./TodoListFilter");
const analyticsData = require("./TodoAnalytics");
const updateCheck = require("./TodoCheckUpdate");

module.exports = {
  addTodo,
  deleteTodo,
  getAllTodos,
  updateTodo,
  labelCreate,
  getParticularTodo,
  filterTodosByDate,
  analyticsData,
  updateCheck,
};
