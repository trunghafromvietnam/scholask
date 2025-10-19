"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAdminTickets,
  getAdminTicketDetail,
  updateAdminTicketStatus,
  sendAdminTicketMessage,
} from "@/lib/api";
import { Loader2, AlertTriangle, Inbox, Filter, ChevronRight, MessageSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { DateTime } from "luxon";

// --- Types khớp với backend ---
type TicketSummary = {
  id: number;
  title: string;
  department: string;
  status: string;
  created_at: string;
  updated_at: string;
  requester_email?: string; // phía backend trả về
  user_email?: string;      // fallback nếu backend đang trả field này
};

type TicketMessage = {
  id: number;
  user_id?: number;
  staff_id?: number;
  text: string;
  created_at: string;
  is_internal?: boolean;
};

type TicketDetail = TicketSummary & {
  payload_json?: any;
  messages?: TicketMessage[];
};

// --- Trang chính ---
export default function AdminTicketsPage({ params }: { params: { school: string } }) {
  const { school } = params;
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  const prettySchool = useMemo(
    () => (school ? school.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Admin"),
    [school]
  );

  // Load ticket list (LIVE)
  const loadTickets = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await getAdminTickets(school, {
        status: filterStatus !== "All" ? filterStatus : undefined,
        department: filterDept !== "All" ? filterDept : undefined,
      });
      setTickets(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load tickets.");
      setTickets([]);
    } finally {
      setLoadingList(false);
    }
  }, [school, filterStatus, filterDept]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Chọn ticket => load detail (LIVE)
  const handleSelectTicket = useCallback(
    async (ticketId: number | null) => {
      if (ticketId === null) {
        setSelectedTicket(null);
        return;
      }
      setSelectedTicket(null);
      setLoadingDetail(true);
      setError(null);
      try {
        const detailData = await getAdminTicketDetail(school, ticketId);
        setSelectedTicket(detailData);
      } catch (err: any) {
        setError(err?.message || `Failed to load ticket #${ticketId}.`);
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  // Format date helper
  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return "N/A";
    try {
      const dt = DateTime.fromISO(isoString);
      if (!dt.isValid) return "Invalid Date";
      if (DateTime.now().diff(dt, "days").days < 7) return dt.toRelative() ?? dt.toLocaleString(DateTime.DATETIME_SHORT);
      return dt.toLocaleString(DateTime.DATETIME_SHORT);
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Service Tickets</h1>
        <p className="text-slate-600">
          Manage student requests for <span className="font-semibold">{prettySchool}</span>.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <Filter size={18} className="text-slate-500 flex-shrink-0" />

        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Status:
          </label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              handleSelectTicket(null);
            }}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5"
          >
            <option>All</option>
            <option>Open</option>
            <option>In review</option>
            <option>Needs Info</option>
            <option>Closed</option>
            <option>Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="deptFilter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Department:
          </label>
          <select
            id="deptFilter"
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              handleSelectTicket(null);
            }}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5"
          >
            <option>All</option>
            <option>International</option>
            <option>Admissions</option>
            <option>Registrar</option>
            <option>Student Services</option>
          </select>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* List + Detail */}
      <div className="grid lg:grid-cols-[minmax(350px,_400px)_1fr] gap-6 items-start min-h-[65vh]">
        {/* List */}
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-soft h-full flex flex-col"
        >
          <h3 className="text-base font-semibold p-4 border-b border-slate-200 flex-shrink-0">
            Tickets ({loadingList ? "..." : tickets.length})
          </h3>

          {loadingList ? (
            <div className="flex-1 grid place-items-center p-10">
              <Loader2 className="animate-spin text-blue-500 text-2xl" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex-1 grid place-items-center text-center p-10">
              <Inbox size={32} className="text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">No tickets match the current filters.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t.id)}
                  className={`w-full text-left p-4 border-b border-slate-100 block transition-colors duration-100 ${
                    selectedTicket?.id === t.id ? "bg-blue-50" : "hover:bg-slate-50/60"
                  }`}
                  aria-current={selectedTicket?.id === t.id ? "page" : undefined}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug pr-2" title={t.title}>
                      {t.title}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    Dept: {t.department}{" "}
                    {t.requester_email || t.user_email ? `• ${(t.requester_email || t.user_email) as string}` : ""}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated: {formatDate(t.updated_at)}</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Detail */}
        <AnimatePresence>
          {selectedTicket ? (
            <motion.div
              key={selectedTicket.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-soft h-full flex flex-col"
            >
              <AdminTicketDetailView
                ticket={selectedTicket}
                formatDate={formatDate}
                onStatusChange={async (newStatus) => {
                  await updateAdminTicketStatus(selectedTicket.id, newStatus);
                  await handleSelectTicket(selectedTicket.id);
                  await loadTickets(); // cập nhật lại list
                }}
                onSendMessage={async (text, isInternal) => {
                  await sendAdminTicketMessage(selectedTicket.id, text, isInternal);
                  await handleSelectTicket(selectedTicket.id);
                }}
              />
            </motion.div>
          ) : !loadingList && tickets.length > 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <ChevronRight size={32} className="mb-2 text-slate-300" />
              <p className="font-medium">Select a ticket</p>
              <p className="text-sm">Choose a ticket from the list on the left to view its details and communication history.</p>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Ticket Detail (Admin view) ---
function AdminTicketDetailView({
  ticket,
  formatDate,
  onStatusChange,
  onSendMessage,
}: {
  ticket: TicketDetail;
  formatDate: (isoString: string | null | undefined) => string;
  onStatusChange: (status: string) => Promise<void>;
  onSendMessage: (text: string, isInternal: boolean) => Promise<void>;
}) {
  const [messageText, setMessageText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSendMessage(messageText.trim(), isInternalNote);
      setMessageText("");
      setIsInternalNote(false);
    } catch (error) {
      console.error("Send message failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0 bg-slate-50/50 rounded-t-2xl">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 leading-tight">{ticket.title}</h3>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>
                Req: <span className="font-medium text-slate-600">{ticket.requester_email || ticket.user_email || "N/A"}</span>
              </span>
              <span>
                Dept: <span className="font-medium text-slate-600">{ticket.department}</span>
              </span>
              <span>
                Created: <span className="font-medium text-slate-600">{formatDate(ticket.created_at)}</span>
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            <label htmlFor="ticketStatus" className="sr-only">
              Ticket Status
            </label>
            <select
              id="ticketStatus"
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={isSubmitting}
              className="text-xs font-semibold border-slate-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-7 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option>Open</option>
              <option>In review</option>
              <option>Needs Info</option>
              <option>Closed</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
        {/* Payload */}
        {ticket.payload_json && (
          <details className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <summary className="p-2 text-sm font-medium cursor-pointer text-slate-700 hover:bg-slate-100">
              View Submitted Form Data
            </summary>
            <pre className="p-3 text-xs bg-white border-t border-slate-200 overflow-x-auto scrollbar-thin">
              {JSON.stringify(ticket.payload_json, null, 2)}
            </pre>
          </details>
        )}

        {/* Messages */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-slate-600">Communication History</h4>
          <div className="space-y-4">
            {(ticket.messages || []).map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg border text-xs shadow-sm ${
                  msg.is_internal
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : msg.staff_id
                    ? "bg-slate-50 border-slate-200 ml-6 text-slate-800"
                    : "bg-blue-50 border-blue-200 mr-6 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="font-semibold">{msg.is_internal ? "Internal Note" : msg.staff_id ? "Staff" : "Student"}</span>
                  <span className="text-slate-400">{formatDate(msg.created_at)}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}

            {(!ticket.messages || ticket.messages.length === 0) && (
              <p className="text-xs text-center text-slate-400 italic py-4">No messages have been exchanged yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 rounded-b-2xl">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={3}
          placeholder={isInternalNote ? "Write an internal note (student won't see this)..." : "Write a reply to the student..."}
          className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 border-slate-400 disabled:opacity-50"
              disabled={isSubmitting}
            />
            Internal Note Only
          </label>
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
            {isSubmitting ? "Sending..." : isInternalNote ? "Save Note" : "Send Reply"}
          </button>
        </div>
      </div>
    </>
  );
}
