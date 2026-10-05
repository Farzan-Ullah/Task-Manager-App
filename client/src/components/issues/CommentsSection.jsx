import React, { useState, useRef } from "react";
import { MessageSquare, Send, Trash2, Edit, AtSign, Check, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";
import moment from "moment";
import { useApp } from "../../context/AppContext";

const CommentsSection = ({ issue, comments = [], onCommentAdded, projectMembers = [] }) => {
  const { user } = useApp();
  const [newCommentBody, setNewCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mention Suggestions Popover state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingBody, setEditingBody] = useState("");

  const textareaRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewCommentBody(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1 && lastAtSymbol >= textBeforeCursor.length - 20) {
      const query = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query.toLowerCase());
        setShowMentionSuggestions(true);
        setMentionPosition(lastAtSymbol);
        return;
      }
    }
    setShowMentionSuggestions(false);
  };

  const insertMention = (member) => {
    const nameToInsert = `@${member.userId?.name || member.userId?.email || "user"} `;
    const before = newCommentBody.substring(0, mentionPosition);
    const after = newCommentBody.substring(textareaRef.current.selectionStart);
    setNewCommentBody(before + nameToInsert + after);
    setShowMentionSuggestions(false);
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentBody.trim() || !issue?._id) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/v1/issues/${issue._id}/comments`, {
        body: newCommentBody.trim(),
      });

      if (res.data.success) {
        toast.success("Comment added");
        setNewCommentBody("");
        onCommentAdded && onCommentAdded();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/v1/comments/${commentId}`);
      toast.success("Comment deleted");
      onCommentAdded && onCommentAdded();
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingBody.trim()) return;
    try {
      await api.patch(`/v1/comments/${commentId}`, { body: editingBody.trim() });
      toast.success("Comment updated");
      setEditingCommentId(null);
      setEditingBody("");
      onCommentAdded && onCommentAdded();
    } catch (err) {
      toast.error("Failed to update comment");
    }
  };

  // Render mentions with styling
  const renderFormattedBody = (text) => {
    const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="inline-block px-1.5 py-0.2 rounded font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Filter mention suggestions
  const filteredSuggestions = projectMembers.filter((m) => {
    const name = (m.userId?.name || "").toLowerCase();
    const email = (m.userId?.email || "").toLowerCase();
    return name.includes(mentionQuery) || email.includes(mentionQuery);
  });

  return (
    <div className="space-y-4">
      {/* New Comment Box */}
      <div className="relative">
        <form onSubmit={handleAddComment} className="space-y-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="Write a comment... (Type @ to mention someone)"
              value={newCommentBody}
              onChange={handleInputChange}
              className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
            />

            {/* Mention Suggestions Popover */}
            {showMentionSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-3 bottom-full mb-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-20 overflow-hidden py-1 max-h-40 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-slate-400 uppercase">
                  Mention Member
                </div>
                {filteredSuggestions.map((m) => (
                  <div
                    key={m.userId?._id || m.userId}
                    onClick={() => insertMention(m)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer text-xs"
                  >
                    <AtSign className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    <span className="font-medium text-gray-800 dark:text-slate-200">
                      {m.userId?.name || m.userId?.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-400 dark:text-slate-400">
              Pro-tip: type <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-gray-700 dark:text-slate-300">@name</kbd> to notify team members
            </span>
            <button
              type="submit"
              disabled={submitting || !newCommentBody.trim()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500">No comments yet. Start the discussion!</div>
        ) : (
          comments.map((c) => {
            const isAuthor = user?.userId === c.authorId?._id;
            const isEditing = editingCommentId === c._id;

            return (
              <div
                key={c._id}
                className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex items-start space-x-3 group"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {(c.authorId?.name || c.authorId?.email || "U").charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                        {c.authorId?.name || c.authorId?.email}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400">
                        {moment(c.createdAt).fromNow()}
                      </span>
                    </div>

                    {isAuthor && !isEditing && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCommentId(c._id);
                            setEditingBody(c.body);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c._id)}
                          className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        rows={2}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-gray-300 dark:border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      />
                      <div className="flex justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-2.5 py-1 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateComment(c._id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {renderFormattedBody(c.body)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
