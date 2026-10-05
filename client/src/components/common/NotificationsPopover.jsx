import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Bell, CheckCheck, MessageSquare, AtSign, UserCheck, Zap, ArrowRight, Clock } from "lucide-react";
import moment from "moment";

const NotificationsPopover = () => {
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case "ASSIGNMENT":
        return <UserCheck className="w-3.5 h-3.5 text-blue-600" />;
      case "MENTION":
        return <AtSign className="w-3.5 h-3.5 text-purple-600" />;
      case "COMMENT":
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case "STATUS_CHANGE":
        return <ArrowRight className="w-3.5 h-3.5 text-amber-600" />;
      case "AUTOMATION":
        return <Zap className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />;
    }
  };

  const handleNotificationClick = (n) => {
    markNotificationAsRead(n._id);
    const targetIssueId =
      n.payload?.issueId?._id ||
      n.payload?.issueId?.id ||
      (typeof n.payload?.issueId === "string" ? n.payload.issueId : null);

    if (targetIssueId) {
      window.dispatchEvent(
        new CustomEvent("open-issue-detail", { detail: { issueId: targetIssueId } })
      );
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="flex items-center space-x-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                      isUnread
                        ? "bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50"
                        : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-xs font-semibold truncate ${isUnread ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-slate-300"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 ml-2">
                          {moment(n.createdAt).fromNow(true)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 mt-2"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPopover;
