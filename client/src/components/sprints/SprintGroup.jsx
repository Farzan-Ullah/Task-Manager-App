import React, { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import {
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Plus,
  Target,
  Edit,
  Trash2,
  Sparkles,
} from "lucide-react";
import moment from "moment";
import BacklogIssueRow from "./BacklogIssueRow";

const SprintGroup = ({
  sprint = null, // null for Backlog pool
  issues = [],
  availableSprints = [],
  onStartSprint,
  onCompleteSprint,
  onEditSprint,
  onDeleteSprint,
  onDeleteIssue,
  onMoveToSprint,
  onQuickCreateIssue,
  isGuest = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  const isBacklog = !sprint;
  const droppableId = isBacklog ? "backlog" : `sprint:${sprint._id}`;

  const totalPoints = issues.reduce((acc, i) => acc + (i.estimate || 0), 0);
  const completedPoints = issues
    .filter((i) => i.status === "Done")
    .reduce((acc, i) => acc + (i.estimate || 0), 0);
  const completionPercentage =
    totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await onQuickCreateIssue &&
      onQuickCreateIssue(quickTitle.trim(), isBacklog ? null : sprint._id);
    setQuickTitle("");
    setIsQuickCreating(false);
  };

  const statusBadges = {
    ACTIVE: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500/20",
    PLANNED: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    COMPLETED: "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700",
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        sprint?.status === "ACTIVE"
          ? "bg-white dark:bg-slate-900 border-emerald-300/80 dark:border-emerald-700/60 shadow-md ring-1 ring-emerald-500/10"
          : "bg-white dark:bg-slate-900 border-gray-200/90 dark:border-slate-800 shadow-2xs hover:border-gray-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Group Header */}
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-slate-900/90 rounded-t-2xl border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm truncate">
              {isBacklog ? "Backlog" : sprint.name}
            </h3>

            {!isBacklog && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  statusBadges[sprint.status] || statusBadges.PLANNED
                }`}
              >
                {sprint.status}
              </span>
            )}

            <span className="text-xs text-gray-400 dark:text-slate-400 font-medium">
              ({issues.length} {issues.length === 1 ? "issue" : "issues"})
            </span>
          </div>

          {!isBacklog && sprint.startDate && sprint.endDate && (
            <div className="hidden md:flex items-center space-x-1 text-[11px] text-gray-500 dark:text-slate-400 ml-2 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
              <span>
                {moment(sprint.startDate).format("MMM D")} -{" "}
                {moment(sprint.endDate).format("MMM D, YYYY")}
              </span>
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
          {/* Progress or points badge */}
          {!isBacklog && sprint.status === "ACTIVE" ? (
            <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="w-16 bg-emerald-200 dark:bg-emerald-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                {completedPoints}/{totalPoints} pts
              </span>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono text-xs font-bold border border-gray-200/60 dark:border-slate-700">
              {totalPoints} pts
            </span>
          )}

          {/* Action Buttons */}
          {!isBacklog && !isGuest && (
            <>
              {sprint.status === "PLANNED" && (
                <button
                  onClick={() => onStartSprint && onStartSprint(sprint)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Start Sprint</span>
                </button>
              )}

              {sprint.status === "ACTIVE" && (
                <button
                  onClick={() => onCompleteSprint && onCompleteSprint(sprint)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Sprint</span>
                </button>
              )}

              {/* Menu for edit/delete */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        onEditSprint && onEditSprint(sprint);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-1.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <Edit className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      Edit Sprint
                    </button>
                    <button
                      onClick={() => {
                        onDeleteSprint && onDeleteSprint(sprint);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2 text-red-400" />
                      Delete Sprint
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Goal Banner */}
      {!isBacklog && sprint.goal && isOpen && (
        <div className="px-4 py-2 bg-indigo-50/30 dark:bg-indigo-950/40 border-b border-indigo-100/50 dark:border-indigo-900/40 flex items-center space-x-2 text-xs text-indigo-900 dark:text-indigo-200">
          <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="font-medium text-[11px] truncate">
            <strong>Goal:</strong> {sprint.goal}
          </span>
        </div>
      )}

      {/* Droppable Issues Area */}
      {isOpen && (
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 space-y-2 min-h-16 transition-colors rounded-b-2xl ${
                snapshot.isDraggingOver ? "bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-400/50" : ""
              }`}
            >
              {issues.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                  {isBacklog
                    ? "Your backlog is clear! Create issues below to queue work."
                    : "No issues in this sprint. Drag tasks here from the backlog or another sprint."}
                </div>
              ) : (
                issues.map((iss, index) => (
                  <BacklogIssueRow
                    key={iss._id}
                    issue={iss}
                    index={index}
                    availableSprints={availableSprints}
                    onDelete={onDeleteIssue}
                    onMoveToSprint={onMoveToSprint}
                  />
                ))
              )}
              {provided.placeholder}

              {/* Inline Quick Create Form - Hidden for Guests */}
              {!isGuest && (
                isQuickCreating ? (
                  <form
                    onSubmit={handleQuickCreate}
                    className="flex items-center space-x-2 pt-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="What needs to be done? Press Enter..."
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-600 focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-2xs font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!quickTitle.trim()}
                      className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 shadow-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickCreating(false);
                        setQuickTitle("");
                      }}
                      className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsQuickCreating(true)}
                    className="w-full py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-xl border border-dashed border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all flex items-center justify-start space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      Create issue in {isBacklog ? "Backlog" : sprint.name}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};

export default SprintGroup;
