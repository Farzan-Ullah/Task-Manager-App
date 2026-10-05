import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import DatePicker from "react-calendar";
import "react-calendar/dist/Calendar.css";

const TaskModal = ({ isOpen, onClose, fetchTodos, users, isAdmin, editData }) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [tasks, setTasks] = useState([{ title: "", completed: false }]);
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || "");
      setPriority(editData.priority || "");
      setAssigneeEmail(editData.assignee?.email || "");
      setTasks(editData.tasks && editData.tasks.length > 0 ? editData.tasks : [{ title: "", completed: false }]);
      setDate(editData.date ? new Date(editData.date) : null);
    } else {
      setTitle("");
      setPriority("");
      setAssigneeEmail("");
      setTasks([{ title: "", completed: false }]);
      setDate(null);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleAddTask = () => {
    setTasks([...tasks, { title: "", completed: false }]);
  };

  const handleTaskChange = (index, value) => {
    const newTasks = [...tasks];
    newTasks[index].title = value;
    setTasks(newTasks);
  };

  const handleRemoveTask = (index) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !priority || tasks.length === 0 || !tasks[0].title) {
      toast.error("Please fill in all required fields (title, priority, checklist)");
      return;
    }

    try {
      const payload = {
        title,
        priority,
        tasks,
        date: date ? date.toISOString() : null,
      };
      if (isAdmin && assigneeEmail) {
        payload.assigneeEmail = assigneeEmail;
      }

      let res;
      if (editData && editData._id) {
        res = await api.put(`/todos/update/${editData._id}`, payload);
      } else {
        payload.label = "TO-DO";
        res = await api.post("/todos/addtodo", payload);
      }

      if (res.data.success) {
        toast.success(editData ? "Task updated successfully" : "Task created successfully");
        fetchTodos();
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save task");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Title *</label>
            <input
              type="text"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Priority *</label>
            <div className="flex space-x-3">
              {["HIGH", "MODERATE", "LOW"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-4 rounded-xl border font-medium text-sm transition-all ${
                    priority === p
                      ? p === "HIGH" ? "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 font-semibold"
                      : p === "MODERATE" ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                      : "bg-green-50 dark:bg-emerald-950/60 border-green-200 dark:border-emerald-900/40 text-green-700 dark:text-emerald-300 font-semibold"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    p === "HIGH" ? "bg-red-500" : p === "MODERATE" ? "bg-blue-500" : "bg-green-500"
                  }`}></span>
                  {p} PRIORITY
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Assign To (Optional)</label>
              <select
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="">Self (Unassigned)</option>
                {users.map((u) => (
                  <option key={u._id} value={u.email}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Checklist *</label>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => {
                      const newTasks = [...tasks];
                      newTasks[index].completed = e.target.checked;
                      setTasks(newTasks);
                    }}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Task description"
                    value={task.title}
                    onChange={(e) => handleTaskChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddTask}
              className="mt-4 flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New Task
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {date ? date.toLocaleDateString() : "Select Due Date"}
              </button>
              {showDatePicker && (
                <div className="absolute bottom-full left-0 mb-2 z-10 bg-white dark:bg-slate-800 shadow-xl rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <DatePicker onChange={(d) => { setDate(d); setShowDatePicker(false); }} value={date} />
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
              >
                Save Task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
