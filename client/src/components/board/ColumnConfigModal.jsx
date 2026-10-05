import React, { useState } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const ColumnConfigModal = ({ isOpen, onClose, board, onColumnsUpdated }) => {
  const [columns, setColumns] = useState(() => board?.columns || []);
  const [newColName, setNewColName] = useState("");
  const [newColWip, setNewColWip] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setColumns(updated);
  };

  const handleUpdateField = (index, field, value) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleDeleteColumn = (index) => {
    if (columns.length <= 1) {
      toast.error("Board must have at least one column");
      return;
    }
    const updated = columns.filter((_, i) => i !== index);
    setColumns(updated);
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol = {
      id: newColName.toLowerCase().replace(/\s+/g, "-"),
      name: newColName.trim(),
      statusMap: newColName.trim(),
      wipLimit: Number(newColWip) || 0,
      order: columns.length,
    };

    setColumns([...columns, newCol]);
    setNewColName("");
    setNewColWip(0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/v1/boards/${board._id}/columns`, { columns });
      if (res.data.success) {
        toast.success("Board columns updated successfully!");
        onColumnsUpdated && onColumnsUpdated(res.data.board);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update columns");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Configure Columns & WIP Limits</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Columns List */}
        <div className="space-y-2.5 mb-5">
          {columns.map((col, index) => (
            <div
              key={col.id || index}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-slate-700"
            >
              <div className="flex items-center space-x-2 flex-1 mr-3">
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => handleUpdateField(index, "name", e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none w-36"
                />

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">WIP:</span>
                  <input
                    type="number"
                    min="0"
                    value={col.wipLimit || 0}
                    onChange={(e) => handleUpdateField(index, "wipLimit", e.target.value)}
                    title="Work in Progress limit (0 = unlimited)"
                    className="px-2 py-1 text-xs font-mono font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 w-14 text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === columns.length - 1}
                  onClick={() => handleMove(index, 1)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteColumn(index)}
                  className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Column Form */}
        <form onSubmit={handleAddColumn} className="p-3 bg-gray-50/70 dark:bg-slate-800/40 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl mb-6">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Add New Column</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Column title (e.g. Staging)"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="number"
              min="0"
              placeholder="WIP"
              title="WIP limit (0 = unlimited)"
              value={newColWip || ""}
              onChange={(e) => setNewColWip(e.target.value)}
              className="w-16 px-2 py-1.5 text-xs text-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0"
            >
              Add
            </button>
          </div>
        </form>

        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Column Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnConfigModal;
