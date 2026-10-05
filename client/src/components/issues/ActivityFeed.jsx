import React from "react";
import moment from "moment";
import { History, ArrowRight, UserCheck, CheckCircle2, MessageSquare, Paperclip, Zap } from "lucide-react";

const ActivityFeed = ({ activities = [] }) => {
  const getActionDetails = (act) => {
    switch (act.action) {
      case "STATUS_CHANGED":
        return {
          icon: <ArrowRight className="w-3.5 h-3.5 text-amber-500" />,
          text: `changed status ${
            act.diff?.status
              ? `from "${act.diff.status.from}" to "${act.diff.status.to}"`
              : ""
          }`,
        };
      case "ASSIGNED":
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-blue-500" />,
          text: `assigned the issue`,
        };
      case "ISSUE_CREATED":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
          text: `created the issue`,
        };
      case "COMMENT_ADDED":
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-purple-500" />,
          text: `added a comment`,
        };
      case "ATTACHMENT_ADDED":
        return {
          icon: <Paperclip className="w-3.5 h-3.5 text-indigo-500" />,
          text: `uploaded an attachment ${act.diff?.fileName ? `"${act.diff.fileName}"` : ""}`,
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5 text-gray-500" />,
          text: `updated the issue`,
        };
    }
  };

  if (!activities || activities.length === 0) {
    return <div className="p-4 text-center text-xs text-gray-400">No activity recorded yet</div>;
  }

  return (
    <div className="space-y-3 pt-2">
      {activities.map((act) => {
        const details = getActionDetails(act);
        return (
          <div key={act._id} className="flex items-start space-x-3 text-xs">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              {details.icon}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-800">
                <span className="font-semibold text-gray-900">
                  {act.actorId?.name || act.actorId?.email || "Someone"}
                </span>{" "}
                {details.text}
              </p>
              <span className="text-[10px] text-gray-400">
                {moment(act.createdAt).fromNow()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
