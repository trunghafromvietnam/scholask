"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getMySubmissions,
  getAdminTicketDetail,
  sendAdminTicketMessage,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import MessageList from "@/components/MessageList";
import MessageComposer from "@/components/MessageComposer";
import RequiredDocs from "@/components/RequiredDocs";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RotateCcw, ListFilter, AlertTriangle, Loader2 } from "lucide-react";
import { DateTime } from "luxon";

type SubmissionSummary = {
  id: number;
  ticket_id: number | null;
  form_name: string;
  created_at: string;
  status: string;
  dept?: string;
  timeline?: { at: string; name: string }[];
};

type TicketMessage = {
  id: number;
  user_id?: number;
  staff_id?: number;
  text: string;
  created_at: string;
  is_internal?: boolean;
};

type TicketDetail = {
  id: number;
  title?: string;
  requester_email?: string;
  department?: string;
  status: string;
  missing?: string[];
  messages?: TicketMessage[];
  payload_json?: any;
  created_at: string;
  updated_at: string;
};

const STATUSES = [
  "All",
  "Submitted",
  "Open",
  "In review",
  "Needs Info",
  "Approved",
  "Rejected",
  "Closed",
];

export default function TrackingPage({ params }: { params: { school: string } }) {
  const { school } = params;

  const [list, setList] = useState<SubmissionSummary[]>([]);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const prettySchool = useMemo(
    () => school.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase()),
    [school]
  );

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    setSelectedTicketId(null);
    setDetail(null);
    try {
      const submissions = await getMySubmissions(school);
      const mappedList: SubmissionSummary[] = submissions.map((sub: any) => ({
        id: sub.id,
        ticket_id: sub.ticket_id ?? null,
        form_name: sub.form_name ?? "Submission",
        created_at: sub.created_at,
        status: sub.status ?? "Submitted",
        dept: sub.dept ?? undefined,
        timeline: sub.timeline ?? [],
      }));
      setList(mappedList);
    } catch (error: any) {
      setListError(error?.message || "Could not load your submissions.");
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [school]);

  const loadDetail = useCallback(async (ticketId: number) => {
    if (!ticketId) return;
    setLoadingDetail(true);
    setDetail(null);
    setDetailError(null);
    try {
      const ticketData = await getAdminTicketDetail(school, ticketId);
      setDetail(ticketData);
    } catch (error: any) {
      setDetailError(error?.message || `Could not load details for ticket #${ticketId}.`);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedTicketId) return;
      await sendAdminTicketMessage(selectedTicketId, text);
      await loadDetail(selectedTicketId);
    },
    [selectedTicketId, loadDetail]
  );

  const handleDocUploaded = useCallback(
    (_docName: string) => {
      if (selectedTicketId) {
        loadDetail(selectedTicketId);
      }
    },
    [selectedTicketId, loadDetail]
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedTicketId) loadDetail(selectedTicketId);
    else setDetail(null);
  }, [selectedTicketId, loadDetail]);

  const filteredList = useMemo(() => {
    let arr = [...list];
    if (filterStatus !== "All") arr = arr.filter((x) => x.status === filterStatus);
    if (q.trim()) {
      const qq = q.toLowerCase();
      arr = arr.filter(
        (x) =>
          `${x.id}`.includes(qq) ||
          x.form_name.toLowerCase().includes(qq) ||
          (x.dept ? x.dept.toLowerCase().includes(qq) : false)
      );
    }
    return arr.sort(
      (a, b) =>
        DateTime.fromISO(b.created_at).toMillis() -
        DateTime.fromISO(a.created_at).toMillis()
    );
  }, [list, q, filterStatus]);

  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return "—";
    const dt = DateTime.fromISO(isoString);
    if (!dt.isValid) return isoString ?? "—";
    return dt.toLocaleString({
      ...DateTime.DATETIME_MED,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-[calc(100vh-theme(spacing.14))] bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Application Tracking</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            View status, communicate with departments, and manage documents for your requests at{" "}
            <span className="font-semibold">{prettySchool}</span>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="my-6 flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-grow md:flex-grow-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or Form Name..."
              className="w-full md:w-64 pl-9 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <ListFilter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setSelectedTicketId(null);
              }}
              className="w-full appearance-none pl-9 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadList}
            disabled={loadingList}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition
              ${loadingList ? "bg-slate-200 text-slate-500 border-slate-300" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"}`}
          >
            <RotateCcw size={14} className={loadingList ? "animate-spin" : ""} />
            Refresh
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-[minmax(320px,1fr)_2fr] gap-6 items-start min-h-[65vh]">
          <motion.aside
            layout
            className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col min-h-[50vh]"
          >
            <h3 className="text-base font-semibold p-4 border-b border-slate-200 text-slate-800">
              Your Submissions {loadingList ? "" : `(${filteredList.length})`}
            </h3>

            {loadingList ? (
              <div className="flex-1 grid place-items-center p-8 text-slate-500">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  Loading…
                </div>
              </div>
            ) : listError ? (
              <div className="p-4 text-red-700 flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5" size={16} />
                <span>{listError}</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex-1 grid place-items-center p-8 text-slate-500 text-sm">
                No submissions found.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                {filteredList.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedTicketId(sub.ticket_id!)}
                    disabled={!sub.ticket_id}
                    className={`w-full text-left p-4 border-b border-slate-100 transition ${
                      selectedTicketId === sub.ticket_id
                        ? "bg-blue-50"
                        : "hover:bg-slate-50/60"
                    } ${!sub.ticket_id ? "opacity-60 cursor-not-allowed" : ""}`}
                    aria-current={selectedTicketId === sub.ticket_id ? "page" : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-800">
                        {sub.form_name} (Sub #{sub.id})
                      </span>
                      <StatusBadge status={sub.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Ticket #{sub.ticket_id ?? "N/A"} • Dept: {sub.dept || "N/A"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Submitted: {formatDate(sub.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.aside>

          <AnimatePresence>
            {selectedTicketId ? (
              <motion.section
                key={selectedTicketId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col min-h-[50vh]"
              >
                {loadingDetail ? (
                  <div className="flex-1 grid place-items-center p-8 text-slate-500">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="animate-spin" size={16} />
                      Loading details…
                    </div>
                  </div>
                ) : detailError ? (
                  <div className="p-4 text-red-700 flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5" size={16} />
                    <span>{detailError}</span>
                  </div>
                ) : detail ? (
                  <TrackingDetailView
                    ticket={detail}
                    timeline={list.find((s) => s.ticket_id === selectedTicketId)?.timeline}
                    onSendMessage={handleSendMessage}
                    onDocUploaded={handleDocUploaded}
                    formatDate={formatDate}
                  />
                ) : (
                  <div className="p-6 text-center text-slate-500">Could not load ticket details.</div>
                )}
              </motion.section>
            ) : !loadingList && filteredList.length > 0 ? (
              <motion.section
                key="placeholder"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm grid place-items-center min-h-[50vh] p-6 text-slate-500 text-sm"
              >
                Select a submission on the left to view details.
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function TrackingDetailView({
  ticket,
  timeline,
  onSendMessage,
  onDocUploaded,
  formatDate,
}: {
  ticket: TicketDetail;
  timeline?: { at: string; name: string }[];
  onSendMessage: (text: string) => Promise<void>;
  onDocUploaded: (docName: string) => void;
  formatDate: (isoString: string | null | undefined) => string;
}) {
  const [activeTab, setActiveTab] = useState<"messages" | "timeline" | "docs">("messages");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // onSend phải là void để khớp kiểu của MessageComposer
  const handleSend = (text: string) => {
    setIsSubmitting(true);
    onSendMessage(text).finally(() => setIsSubmitting(false));
  };

  const tabs = [
    { id: "messages", label: "Messages", count: ticket.messages?.filter((m) => !m.is_internal).length ?? 0 },
    { id: "timeline", label: "Status Timeline", count: timeline?.length ?? 0 },
    { id: "docs", label: "Required Documents", count: ticket.missing?.length ?? 0 },
  ] as const;

  return (
    <>
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-slate-900 leading-tight">
              {ticket.title || `Ticket #${ticket.id}`}
            </h3>
            <div className="text-xs text-slate-500 mt-1">
              Department:{" "}
              <span className="font-medium text-slate-600">{ticket.department || "N/A"}</span>{" "}
              • Last Updated:{" "}
              <span className="font-medium text-slate-600">{formatDate(ticket.updated_at)}</span>
            </div>
          </div>
          <StatusBadge status={ticket.status} large />
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-4 bg-slate-50/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-3 text-sm font-semibold border-b-2 -mb-px transition
              ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
        <AnimatePresence mode="wait">
          {activeTab === "messages" && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h4 className="text-sm font-semibold mb-3 text-slate-600">
                Messages with {ticket.department || "Staff"}
              </h4>
              <MessageList
                items={
                  (ticket.messages?.filter((m) => !m.is_internal) || []).map((m) => ({
                    by: m.staff_id ? "Staff" : "You",
                    at: formatDate(m.created_at),
                    text: m.text,
                  }))
                }
              />
            </motion.div>
          )}
          {activeTab === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h4 className="text-sm font-semibold mb-3 text-slate-600">Status History</h4>
              {timeline && timeline.length > 0 ? (
                <Timeline items={timeline} />
              ) : (
                <p className="text-xs text-slate-500 italic">No timeline available yet.</p>
              )}
            </motion.div>
          )}
          {activeTab === "docs" && (
            <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h4 className="text-sm font-semibold mb-3 text-slate-600">Required Documents</h4>
              <RequiredDocs ticketId={ticket.id} docs={ticket.missing || []} onUploaded={onDocUploaded} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeTab === "messages" && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 rounded-b-2xl">
          <div className={isSubmitting ? "opacity-50 pointer-events-none" : ""}>
            <MessageComposer
              onSend={handleSend}
              placeholder={`Send a reply to ${ticket.department || "Staff"}...`}
            />
          </div>
        </div>
      )}
    </>
  );
}

