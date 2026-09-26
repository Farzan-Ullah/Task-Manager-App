import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Plus, MoreVertical, Calendar as CalendarIcon, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";
import TaskModal from "../components/TaskModal";

const Board = () => {
  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedTodos, setExpandedTodos] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [editData, setEditData] = useState(null);

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isAdmin = user.role === "Admin";

  const fetchTodos = async () => {
    try {
      const res = await api.get(`/todos/filter/${filter}`);
      if (res.data.success) {
        setTodos(res.data.todos || []);
      }
    } catch (error) {
      toast.error("Failed to fetch tasks");
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/user/allUsers");
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns = ["BACKLOG", "TO-DO", "PROGRESS", "DONE"];

  const getFilteredTodos = (label) => {
    return todos.filter((todo) => todo.label === label);
  };

  const toggleExpand = (todoId) => {
    setExpandedTodos((prev) => ({
      ...prev,
      [todoId]: !prev[todoId],
    }));
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/todos/delete/${id}`);
      if (res.data.success) {
        toast.success("Task deleted");
        fetchTodos();
      }
    } catch (error) {
      toast.error("Failed to delete task");
    }
    setActiveMenu(null);
  };

  const handleChangeLabel = async (id, label) => {
    try {
      const res = await api.put(`/todos/label/${id}`, { label });
      if (res.data.success) {
        fetchTodos();
      }
    } catch (error) {
      toast.error("Failed to move task");
    }
  };

  const handleToggleTask = async (todo, taskIndex) => {
    const newTasks = [...todo.tasks];
    newTasks[taskIndex].completed = !newTasks[taskIndex].completed;
    try {
      const res = await api.put(`/todos/checkupdate/${todo._id}`, { tasks: newTasks });
      if (res.data.success) {
        fetchTodos();
      }
    } catch (error) {
      toast.error("Failed to update checklist");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
          <p className="text-sm text-gray-500">{moment().format("Do MMM, YYYY")}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-gray-300 rounded-xl py-2 pl-3 pr-10 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-6 min-w-max h-full pb-4">
          {columns.map((column) => (
            <div key={column} className="w-80 bg-gray-100 rounded-2xl flex flex-col max-h-full">
              <div className="p-4 flex justify-between items-center border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">{column.replace("-", " ")}</h3>
                <div className="flex space-x-2">
                  {column === "TO-DO" && isAdmin && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {getFilteredTodos(column).map((todo) => (
                  <div key={todo._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        todo.priority === "HIGH" ? "bg-red-100 text-red-700" :
                        todo.priority === "MODERATE" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {todo.priority} PRIORITY
                      </span>
                      {isAdmin && (
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenu(activeMenu === todo._id ? null : todo._id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                          {activeMenu === todo._id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-1">
                              <button
                                onClick={() => {
                                  setEditData(todo);
                                  setIsModalOpen(true);
                                  setActiveMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(todo._id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/share/${todo._id}`);
                                  toast.success("Link copied!");
                                  setActiveMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Share Link
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-3 text-lg leading-snug">{todo.title}</h4>
                    
                    <div className="mb-4">
                      <button 
                        onClick={() => toggleExpand(todo._id)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 w-full"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Checklist ({todo.tasks.filter(t => t.completed).length}/{todo.tasks.length})
                        <div className="ml-auto bg-gray-100 p-1 rounded">
                          {expandedTodos[todo._id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                      </button>
                      
                      {expandedTodos[todo._id] && (
                        <div className="mt-3 space-y-2">
                          {todo.tasks.map((task, index) => (
                            <div key={task._id || index} className="flex items-start bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <input 
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleTask(todo, index)}
                                className="mt-1 mr-2 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                              />
                              <span className={`text-sm ${task.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                {task.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <div className="flex flex-wrap gap-2">
                        {columns.filter(c => c !== column).map(c => (
                          <button
                            key={c}
                            onClick={() => handleChangeLabel(todo._id, c)}
                            className="text-[10px] font-medium px-2 py-1 bg-gray-50 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                      <div className="flex space-x-2">
                        {todo.assignee && typeof todo.assignee === 'object' && (todo.assignee.name || todo.assignee.email) && (
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold" title={todo.assignee.name || todo.assignee.email}>
                            {(todo.assignee.name || todo.assignee.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {todo.date && (
                        <div className="flex items-center text-xs font-medium text-gray-500 bg-red-50 text-red-600 px-2 py-1 rounded-md">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {moment(todo.date).format("MMM Do")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditData(null); }}
        fetchTodos={fetchTodos}
        users={users}
        isAdmin={isAdmin}
        editData={editData}
      />
    </div>
  );
};

export default Board;
