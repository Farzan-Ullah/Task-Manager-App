import React from "react";
import { Clock, CalendarDays, Users, TrendingUp } from "lucide-react";

const TimesheetSummaryCards = ({
  totalHours = 0,
  todayHours = 0,
  activeContributors = 0,
  dailyAverage = 0,
  entriesCount = 0,
  isManager = true,
}) => {
  const cards = [
    {
      title: "Total Hours Logged",
      value: `${totalHours}h`,
      subtitle: `${entriesCount} logged entries`,
      icon: Clock,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Today's Work Logged",
      value: `${todayHours}h`,
      subtitle: "Time recorded today",
      icon: CalendarDays,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    isManager
      ? {
          title: "Active Contributors",
          value: activeContributors,
          subtitle: "Team members logged",
          icon: Users,
          color: "text-purple-600 bg-purple-50 border-purple-100",
        }
      : {
          title: "Logged Entries",
          value: entriesCount,
          subtitle: "Personal work records",
          icon: CalendarDays,
          color: "text-purple-600 bg-purple-50 border-purple-100",
        },
    {
      title: "Daily Average",
      value: `${dailyAverage}h`,
      subtitle: "Per active working day",
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${card.color} dark:bg-opacity-20 dark:border-opacity-30`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-gray-900 dark:text-slate-100 tracking-tight">
                {card.value}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 font-medium">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};

export default TimesheetSummaryCards;
