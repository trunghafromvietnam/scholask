// app/admin/[school]/knowledge/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react"; // Import React
import { motion } from "framer-motion";
import { UploadCloud, FileText, Globe, Loader2, FilePen, Trash2, RefreshCw, AlertTriangle, File as FileIcon, X } from "lucide-react";
// --- Import react-dropzone ---
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
// --- Import API functions ---
import { listDocuments, deleteDocument, ingestDocument } from "@/lib/api"; // Ensure these functions are correctly defined and exported in lib/api.ts

// --- Component IngestForm (SỬ DỤNG REACT-DROPZONE) ---
function IngestForm({ school, onIngestSuccess }: { school: string; onIngestSuccess: (count: number) => void }) {
  const [mode, setMode] = useState<"file" | "text" | "url">("file");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setMessage(null);
    const newFiles = acceptedFiles.filter(newFile =>
        !filesToUpload.some(existingFile =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size &&
            existingFile.lastModified === newFile.lastModified
        )
    );
    setFilesToUpload(prev => [...prev, ...newFiles]);

    if (fileRejections.length > 0) {
      const rejectedNames = fileRejections.map(f => f.file.name).join(', ');
      setMessage(prev => ({
          ok: false,
          text: `${prev?.text && !prev.ok ? prev.text + ' ' : ''}Rejected files: ${rejectedNames}`.trim()
      }));
    }
  }, [filesToUpload]);

  const acceptTypes: Accept = useMemo(() => ({
    'application/pdf': ['.pdf'], 'text/plain': ['.txt'],
    'text/markdown': ['.md'], 'text/html': ['.html', '.htm'],
  }), []);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop, accept: acceptTypes, multiple: true, noClick: true, noKeyboard: true,
  });

  const removeFile = (indexToRemove: number) => {
    setFilesToUpload(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true); setMessage(null);
    let successCount = 0; let errorMessages: string[] = [];

    if (mode === 'file' && filesToUpload.length > 0) {
      for (const file of filesToUpload) {
        const formData = new FormData(); formData.append("school", school); formData.append("file", file);
        try { await ingestDocument(formData); successCount++; }
        catch (err: any) { errorMessages.push(`'${file.name}': ${err.message || 'Unknown'}`); }
      }
      setFilesToUpload([]);
    } else if (mode === 'text' && text.trim()) {
      const formData = new FormData(); formData.append("school", school); formData.append("text", text.trim());
      try { await ingestDocument(formData); successCount++; setText(""); }
      catch (err: any) { errorMessages.push(`Pasted Text: ${err.message}`); }
    } else if (mode === 'url' && url.trim()) {
      const formData = new FormData(); formData.append("school", school); formData.append("url", url.trim());
      try { await ingestDocument(formData); successCount++; setUrl(""); }
      catch (err: any) { errorMessages.push(`URL: ${err.message}`); }
    } else {
      setMessage({ ok: false, text: "No content." }); setLoading(false); return;
    }

    let resultText = "";
    if (successCount > 0) resultText += `Ingested ${successCount} source(s). `;
    if (errorMessages.length > 0) resultText += `Errors: ${errorMessages.join('; ')}`;
    setMessage({ ok: successCount > 0 && errorMessages.length === 0, text: resultText.trim() });
    if (successCount > 0) onIngestSuccess(successCount);
    setLoading(false);
  }, [school, mode, filesToUpload, text, url, onIngestSuccess, loading]);

  // --- JSX cho IngestForm 
  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-8"
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
    >
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Knowledge Source</h2>
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <TabButton icon={<UploadCloud size={16}/>} label="Upload Files" active={mode === 'file'} onClick={() => setMode('file')} />
        <TabButton icon={<FileText size={16}/>} label="Paste Text" active={mode === 'text'} onClick={() => setMode('text')} />
        <TabButton icon={<Globe size={16}/>} label="Add URL" active={mode === 'url'} onClick={() => setMode('url')} />
      </div> 

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {mode === 'file' && (
          <div className="space-y-4">
            {/* Dropzone Area */}
            <div
              {...getRootProps()}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200 ease-in-out ${
                isDragActive ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
              }`}
            >
              <input {...getInputProps()} id="file-input-dropzone"/>
              <UploadCloud className={`mx-auto h-10 w-10 mb-2 transition-colors ${isDragActive ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
              {isDragActive ? (
                <p className="text-blue-600 font-semibold">Drop files here to upload</p>
              ) : (
                <p className="text-sm text-slate-500">Drag & drop files here, or <button type="button" onClick={openFileDialog} className="text-blue-600 font-medium hover:underline focus:outline-none">click to browse</button> (PDF, TXT, MD)</p>
              )}
            </div>
            {/* File List */}
            {filesToUpload.length > 0 && (
              <div className="mt-4 space-y-2"> {/* Mở div file list */}
                 <h3 className="text-sm font-medium text-slate-700">Files queued for ingest ({filesToUpload.length}):</h3>
                 <ul className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg scrollbar-thin scrollbar-thumb-slate-300"> {/* Mở ul */}
                    {filesToUpload.map((file: File, index: number) => (
                      <li key={`${file.name}-${index}-${file.lastModified}`} className="flex items-center justify-between p-2 bg-white rounded text-xs border border-slate-200 group shadow-sm"> {/* Mở li */}
                         <div className="flex items-center gap-2 overflow-hidden min-w-0"> {/* Mở div file info */}
                            <FileIcon size={14} className="text-slate-500 flex-shrink-0"/>
                            <span className="truncate flex-grow font-medium text-slate-700" title={file.name}>{file.name}</span>
                            <span className="text-slate-400 flex-shrink-0 ml-1">({(file.size / 1024).toFixed(1)} KB)</span>
                         </div> 
                         <button type="button" onClick={() => removeFile(index)} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 flex-shrink-0 ml-2 opacity-60 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-red-400"> {/* Mở nút remove */}
                            <X size={14} />
                         </button> 
                      </li>
                    ))} 
                 </ul>
              </div> 
            )} 
          </div> 
        )} 
        {mode === 'text' && ( <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Paste text content..." className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /> )}
        {mode === 'url' && (
          <div> 
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-school.edu/..." className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-slate-500 mt-1">Note: URL crawling depends on backend setup.</p>
          </div> 
        )} 

        {/* Nút Submit và Message */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 mt-4"> {/* Mở div submit area */}
          <button
            type="button" 
            onClick={handleSubmit}
            disabled={loading || (mode === 'file' && filesToUpload.length === 0) || (mode === 'text' && !text.trim()) || (mode === 'url' && !url.trim())}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
             {loading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16} />}
             {loading ? `Ingesting...` : `Ingest Source${mode === 'file' && filesToUpload.length !== 1 ? 's' : ''}`}
          </button>
          {message && (
             <motion.div
               className={`text-xs font-medium text-right ${message.ok ? 'text-green-600' : 'text-red-600'}`}
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             >
               {message.text}
             </motion.div>
           )}
        </div> 
      </form> 
    </motion.div> 
  ); 
}

// --- Component TabButton ---
const TabButton = ({ icon, label, active, onClick }: {icon: React.ReactNode, label: string, active: boolean, onClick: ()=>void}) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
    {icon} {label}
  </button>
);


// --- Component KnowledgeList (GỌI API THẬT) ---
type DocumentData = {
  id: number; fileName: string | null; sourceType: string; sourceDescription: string | null;
  chunkCount: number | null; vectorCount: number | null; createdAt: string; updatedAt: string;
};

function KnowledgeList({ school, refreshKey }: { school: string; refreshKey: number }) {
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch documents function (memoized)
  const fetchDocuments = useCallback(async () => {
    console.log(`Fetching documents for ${school}...`);
    setLoading(true); setError(null);
    try {
      const data = await listDocuments(school);
      console.log("Documents received:", data);
      setDocs(data || []);
    } catch (err: any) {
      console.error("Failed to load documents:", err);
      setError(err.message || "Failed to load documents.");
      setDocs([]);
    } finally { setLoading(false); }
  }, [school]);

  // Load documents on mount or when refreshKey changes
  useEffect(() => { fetchDocuments(); }, [fetchDocuments, refreshKey]);

  // Delete document handler (memoized)
  const handleDelete = useCallback(async (docId: number, docDesc: string | null) => {
     if (!window.confirm(`Delete source "${docDesc || `ID ${docId}`}"? This cannot be undone and may require re-indexing later.`)) return;
    setDeletingId(docId); setError(null);
    try {
      console.log(`Attempting to delete document ${docId}`);
      await deleteDocument(docId);
      console.log(`Document ${docId} deleted via API.`);
      await fetchDocuments(); // Refresh the list after successful deletion
    } catch (err: any) {
      console.error(`Failed to delete document ${docId}:`, err);
      setError(err.message || `Failed to delete document #${docId}.`);
    } finally { setDeletingId(null); }
  }, [fetchDocuments]); // Depends on fetchDocuments to refresh

  // Format date helper
  const formatDate = (isoString: string | null | undefined): string => {
     if (!isoString) return "N/A";
     try { return new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); }
     catch { return "Invalid Date"; }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6" // Consistent style
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
    >
      {/* Header + Refresh Button */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Managed Knowledge Sources</h2>
        <button
          onClick={fetchDocuments}
          disabled={loading || !!deletingId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh List
        </button>
      </div>

      {/* Error Display */}
      {error && (
         <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle size={16}/> {error}
         </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm table-fixed"> {/* Added table-fixed */}
          <thead className="border-b border-slate-200">
            <tr className="text-slate-500 font-medium text-xs uppercase tracking-wider"> {/* Adjusted header style */}
              <th className="p-3 w-2/5">Source Description</th> {/* Adjusted width */}
              <th className="p-3 w-1/6">Type</th>
              <th className="p-3 w-[80px] text-center">Chunks</th> {/* Fixed width */}
              <th className="p-3 w-1/4">Last Updated</th> {/* Adjusted width */}
              <th className="p-3 w-[80px] text-right">Actions</th> {/* Fixed width */}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2 text-blue-500 text-lg"/> Loading sources...</td></tr>
            ) : docs.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No documents ingested yet. Use the form above to add knowledge.</td></tr>
            ) : (
              docs.map((doc: DocumentData) => (
                <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-100">
                  <td className="p-3 font-medium text-slate-700 truncate" title={doc.sourceDescription || `Document #${doc.id}`}>
                      {doc.sourceDescription || `Document #${doc.id}`}
                  </td>
                  <td className="p-3 text-slate-500 capitalize">{doc.sourceType}</td>
                  <td className="p-3 text-slate-500 text-center">{doc.chunkCount ?? '-'}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{formatDate(doc.updatedAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-3 justify-end">
                      {/* View/Edit Button (Placeholder) */}
                      <button className="text-slate-400 cursor-not-allowed p-1" title="View/Edit (Not Implemented)" disabled aria-label="Edit Document (Not Implemented)">
                         <FilePen size={16} />
                      </button>
                      {/* Delete Button */}
                      <button
                         onClick={() => handleDelete(doc.id, doc.sourceDescription)}
                         disabled={deletingId === doc.id}
                         className={`p-1 rounded transition-colors duration-150 ${
                            deletingId === doc.id
                            ? 'text-slate-400 cursor-wait'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-400'
                         }`}
                         title={`Delete ${doc.sourceDescription || `ID: ${doc.id}`}`}
                         aria-label={`Delete document ${doc.sourceDescription || `ID: ${doc.id}`}`}
                      >
                         {deletingId === doc.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// --- Component Chính Của Trang ---
export default function AdminKnowledgePage({ params }: { params: { school: string } }) {
  const { school } = params;
  const [refreshKey, setRefreshKey] = useState(0); // State để trigger refresh list

  // Callback được gọi sau khi ingest thành công
  const handleIngestSuccess = useCallback((count: number) => {
     console.log(`Ingest successful (${count} sources), triggering list refresh...`);
     setRefreshKey(k => k + 1); // Thay đổi key để re-render KnowledgeList
  }, []);

  // Format tên trường
  const prettySchool = useMemo(() =>
     school ? school.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "School",
     [school]
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
         <motion.h1
           className="text-2xl md:text-3xl font-bold text-slate-900 mb-1" // Responsive size
           initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
         >
           Knowledge Base
         </motion.h1>
         <motion.p
           className="text-slate-600"
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
         >
           Manage content sources for the AI advisor of <span className="font-semibold">{prettySchool}</span>.
         </motion.p>
      </div>

      {/* Ingest Form Component */}
      <IngestForm school={school} onIngestSuccess={handleIngestSuccess} />

      {/* Knowledge List Component (re-renders when refreshKey changes) */}
      <KnowledgeList school={school} refreshKey={refreshKey} />
    </div>
  );
}