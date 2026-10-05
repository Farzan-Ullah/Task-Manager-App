import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import { Plus, AlertCircle } from "lucide-react";

const KanbanColumn = ({
  column,
  issues = [],
  onAddIssue,
  onDeleteIssue,
  onEditIssue,
  onSelectIssue,
}) => {
  const isOverWip = column.wipLimit > 0 && issues.length > column.wipLimit;

  // Status accent colors
  const statusAccents = {
    Backlog: "bg-gray-400",
    "To Do": "bg-blue-500",
    "In Progress": "bg-amber-500",
    Review: "bg-purple-500",
    Testing: "bg-indigo-500",
    Done: "bg-emerald-500",
  };

  const accentColor = statusAccents[column.name] || "bg-gray-400";

  return (
    <div className="w-72 sm:w-80 flex flex-col shrink-0 bg-gray-100/70 dark:bg-slate-900/60 rounded-2xl border border-gray-200/70 dark:border-slate-800 max-h-full">
      {/* Column Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-gray-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/80 rounded-t-2xl backdrop-blur-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${accentColor}`} />
          <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
            {column.name}
          </h3>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-gray-200/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
            {issues.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* WIP Limit Indicator */}
          {column.wipLimit > 0 && (
            <span
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isOverWip
                  ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              }`}
              title={isOverWip ? "WIP limit exceeded!" : `WIP Limit: ${column.wipLimit}`}
            >
              {isOverWip && <AlertCircle className="w-3 h-3 text-red-500" />}
              <span>
                {issues.length}/{column.wipLimit}
              </span>
            </span>
          )}

          <button
            onClick={() => onAddIssue && onAddIssue(column.statusMap || column.name)}
            title={`Add issue to ${column.name}`}
            className="p-1 hover:bg-gray-200/70 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Droppable Card Area */}
      <Droppable droppableId={column.statusMap || column.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[150px] transition-colors ${
              snapshot.isDraggingOver ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
            }`}
          >
            {issues.map((issue, index) => (
              <KanbanCard
                key={issue._id}
                issue={issue}
                index={index}
                onDelete={onDeleteIssue}
                onEdit={onEditIssue}
                onSelect={onSelectIssue}
              />
            ))}
            {provided.placeholder}

            {issues.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200/80 dark:border-slate-800 rounded-xl text-center p-3 text-gray-400 dark:text-slate-600">
                <span className="text-xs">No issues</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
