import { useState } from 'react';
import { File, UploadCloud, Loader2 } from 'lucide-react';

export default function RequiredDocs({ ticketId, docs, onUploaded }: { ticketId: number; docs: string[]; onUploaded: (docName: string) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (docName: string) => {
    setUploading(docName);
    // (Đây là nơi bạn gọi API upload thật)
    await new Promise(res => setTimeout(res, 1500)); 
    onUploaded(docName);
    setUploading(null);
  };

  if (!docs.length) {
    return (
      <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
        All required documents have been submitted.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
      <h4 className="font-semibold text-orange-800">Action Required: Upload Documents</h4>
      <ul className="space-y-2">
        {docs.map(docName => (
          <li key={docName} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <File size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-slate-700">{docName}</span>
            </div>
            <button
              onClick={() => handleUpload(docName)}
              disabled={!!uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-400"
            >
              {uploading === docName ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UploadCloud size={14} />
              )}
              {uploading === docName ? "Uploading..." : "Upload"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
