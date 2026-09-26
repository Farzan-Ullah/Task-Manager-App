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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
            <div className="flex space-x-3">
              {["HIGH", "MODERATE", "LOW"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-4 rounded-xl border font-medium text-sm transition-all ${
                    priority === p
                      ? p === "HIGH" ? "bg-red-50 border-red-200 text-red-700"
                      : p === "MODERATE" ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-green-50 border-green-200 text-green-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (Optional)</label>
              <select
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
              >
                <option value="">Self (Unassigned)</option>
                {users.map((u) => (
                  <option key={u._id} value={u.email}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Checklist *</label>
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
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Task description"
                    value={task.title}
                    onChange={(e) => handleTaskChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddTask}
              className="mt-4 flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New Task
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {date ? date.toLocaleDateString() : "Select Due Date"}
              </button>
              {showDatePicker && (
                <div className="absolute bottom-full left-0 mb-2 z-10 bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
                  <DatePicker onChange={(d) => { setDate(d); setShowDatePicker(false); }} value={date} />
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
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
