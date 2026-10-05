import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { CheckSquare } from "lucide-react";
import moment from "moment";

const Share = () => {
  const { id } = useParams();
  const [todo, setTodo] = useState(null);

  useEffect(() => {
    const fetchTodo = async () => {
      try {
        const res = await api.get(`/share/${id}`);
        if (res.data.success) {
          setTodo(res.data.todo);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchTodo();
  }, [id]);

  if (!todo) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-start mb-6">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            todo.priority === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" :
            todo.priority === "MODERATE" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" :
            "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          }`}>
            {todo.priority} PRIORITY
          </span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">{todo.title}</h1>
        
        <div className="mb-6">
          <div className="flex items-center text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
            <CheckSquare className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Checklist ({(todo.tasks || []).filter((t) => t.completed).length}/{(todo.tasks || []).length})
          </div>
          <div className="space-y-3">
            {(todo.tasks || []).map((task) => (
              <div key={task._id} className="flex items-center p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-700/60">
                <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${
                  task.completed ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                }`}>
                  {task.completed && <CheckSquare className="w-4 h-4" />}
                </div>
                <span className={`text-sm ${task.completed ? "text-gray-400 dark:text-slate-500 line-through" : "text-gray-700 dark:text-slate-200"}`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {todo.date && (
          <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-slate-800">
            <span className="text-sm text-gray-500 dark:text-slate-400">Due Date</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
              {moment(todo.date).format("MMM Do")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Share;
