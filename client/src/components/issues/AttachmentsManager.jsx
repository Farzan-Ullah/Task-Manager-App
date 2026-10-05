import React, { useState, useRef } from "react";
import { Paperclip, Upload, FileText, Image, Download, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";
import moment from "moment";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const AttachmentsManager = ({ issue, attachments = [], onAttachmentsChanged, isGuest = false }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    if (isGuest) return;
    const file = e.target.files?.[0];
    if (!file || !issue?._id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10 MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await api.post(`/v1/issues/${issue._id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success(`Attached "${file.name}"`);
        onAttachmentsChanged && onAttachmentsChanged();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImageMime = (mime) => mime && mime.startsWith("image/");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            Attachments
          </h4>
          {attachments.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              ({attachments.length})
            </span>
          )}
        </div>

        {!isGuest && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? "Uploading..." : "Attach File"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
          </>
        )}
      </div>

      {/* Attachments Grid */}
      {attachments.length === 0 ? (
        !isGuest ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-center cursor-pointer hover:bg-gray-50/70 dark:hover:bg-slate-850/60 transition-colors"
          >
            <p className="text-xs text-gray-400 dark:text-slate-500">Click or drag files here to attach (Images, PDF, Docs up to 10MB)</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-slate-500 italic">No attachments for this task.</p>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((att) => {
            const isImg = isImageMime(att.mimeType);
            const downloadUrl = att.url?.startsWith("http")
              ? att.url
              : `http://localhost:5001${att.url}`;

            return (
              <div
                key={att._id}
                className="flex items-center space-x-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-slate-700 hover:shadow-2xs transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-200/80 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {isImg ? (
                    <img
                      src={downloadUrl}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate" title={att.name}>
                    {att.name}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">
                    {formatBytes(att.size)} • {moment(att.uploadedAt).fromNow()}
                  </p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={att.name}
                    className="p-1 text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    title="Download / View"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentsManager;
