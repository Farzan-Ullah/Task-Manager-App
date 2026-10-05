import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Search, X, CircleDot, ArrowRight, CornerDownLeft } from "lucide-react";
import api from "../../utils/api";

const GlobalSearchModal = () => {
  const { isSearchOpen, setIsSearchOpen, currentProject } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isSearchOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const projectIdParam = currentProject?._id ? `&projectId=${currentProject._id}` : "";
        const res = await api.get(`/v1/issues?search=${encodeURIComponent(query.trim())}${projectIdParam}&limit=10`);
        if (res.data.success) {
          setResults(res.data.issues || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentProject?._id]);

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-16 sm:pt-24"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search issues by title, key (e.g. PROJ-101), labels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((issue) => (
                <div
                  key={issue._id}
                  onClick={() => {
                    setIsSearchOpen(false);
                    const targetId = typeof issue === "object" ? (issue?._id || issue?.id) : issue;
                    if (targetId && targetId !== "[object Object]") {
                      window.dispatchEvent(new CustomEvent("open-issue-detail", { detail: { issueId: targetId } }));
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                      {issue.key}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {issue.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-medium">
                      {issue.status}
                    </span>
                    <CornerDownLeft className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
              No matching issues found for "{query}"
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-500 space-y-1">
              <p>Type to search issues across {currentProject?.name || "your workspace"}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">Search by summary, key (PROJ-101), labels, or description</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
