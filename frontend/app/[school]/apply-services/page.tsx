"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Clock, CheckCircle, Send, Loader2 } from "lucide-react";
import { submitForm } from "@/lib/api";

type ServiceTab = "admission" | "transcript";

// SUY LUẬN KIỂU TRẢ VỀ CỦA submitForm (có ticket_id: number | null)
type SubmitFormResponse = Awaited<ReturnType<typeof submitForm>>;

type AdmissionData = {
  first_name: string;
  last_name: string;
  email: string;
  intended_term: string;
  finances_confirmed: boolean;
  dob?: string;
  passport_no?: string;
  notes?: string;
};

type TranscriptData = {
  student_id: string;
  recipient_name: string;
  recipient_email: string;
  delivery_method: string;
  notes: string;
};

const INITIAL_ADMISSION: AdmissionData = {
  first_name: "",
  last_name: "",
  email: "",
  intended_term: "",
  finances_confirmed: false,
  dob: "",
  passport_no: "",
  notes: "",
};

const INITIAL_TRANSCRIPT: TranscriptData = {
  student_id: "",
  recipient_name: "",
  recipient_email: "",
  delivery_method: "Electronic (Parchment/NSC)",
  notes: "",
};

export default function ApplyServicesPage({ params }: { params: { school: string } }) {
  const { school } = params;
  const [tab, setTab] = useState<ServiceTab>("admission");
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const schoolTitle = useMemo(
    () => school.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase()),
    [school]
  );

  const tabs: { id: ServiceTab; label: string }[] = [
    { id: "admission", label: "International Admission" },
    { id: "transcript", label: "Transcript Request" },
  ];

  const handleSubmitSuccess = (response: SubmitFormResponse) => {
    setResultMsg({
      ok: true,
      text: `Submitted successfully! Your request (Submission #${response.id}) has created Ticket #${
        response.ticket_id ?? "N/A"
      }. You can monitor its progress in the 'Tracking' section.`,
    });
  };

  const handleSubmitError = (error: Error) => {
    setResultMsg({
      ok: false,
      text: error.message || "Submission failed. Please try again.",
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Apply for Services</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Submit official requests directly to the appropriate department at{" "}
            <span className="font-semibold">{schoolTitle}</span>.
          </p>
        </motion.div>

        <motion.div
          className="relative flex flex-col sm:flex-row w-full sm:w-auto sm:inline-flex p-1 bg-slate-100 rounded-xl my-6 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setResultMsg(null);
              }}
              className={`relative flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${
                tab === t.id ? "text-white" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="active-form-pill-apply"
                  className="absolute inset-0 bg-blue-600 rounded-lg z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          <motion.aside
            className="md:col-span-1"
            key={`${tab}-info`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="sticky top-24">
              <div className="rounded-2xl p-6 bg-white/70 backdrop-blur border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {tab === "admission" ? "Application Guide" : "Transcript Request Guide"}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tab === "admission"
                    ? "Start your F-1 application here. Status updates and document uploads will be handled via the 'Tracking' section after submission."
                    : "Request official or unofficial transcripts. Ensure recipient details are accurate. Processing times vary; check the 'Tracking' section for updates."}
                </p>
                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Direct routing to the correct office.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span>Creates a trackable service ticket.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>Reduces processing delays vs. email.</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.aside>

          <section className="md:col-span-2 rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {tab === "admission" ? (
                    <AdmissionForm
                      school={school}
                      busy={busy}
                      setBusy={setBusy}
                      onSuccess={handleSubmitSuccess}
                      onError={handleSubmitError}
                    />
                  ) : (
                    <TranscriptRequestForm
                      school={school}
                      busy={busy}
                      setBusy={setBusy}
                      onSuccess={handleSubmitSuccess}
                      onError={handleSubmitError}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {resultMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-200 mt-6 pt-6 ${
                  resultMsg.ok ? "text-green-700" : "text-red-700"
                }`}
              >
                <div
                  className={`rounded-lg p-4 border ${
                    resultMsg.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  {resultMsg.text}
                  {resultMsg.ok && (
                    <Link href={`/${school}/tracking`} className="ml-2 font-medium underline hover:text-blue-700">
                      View Tracking
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

interface ServiceFormProps {
  school: string;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onSuccess: (response: SubmitFormResponse) => void; // dùng đúng kiểu
  onError: (error: Error) => void;
}

function AdmissionForm({ school, busy, setBusy, onSuccess, onError }: ServiceFormProps) {
  const [data, setData] = useState<AdmissionData>(INITIAL_ADMISSION);
  const onChange = (k: keyof AdmissionData, v: any) => setData((d) => ({ ...d, [k]: v }));

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      if (!data.first_name || !data.last_name || !data.email || !data.intended_term) {
        throw new Error("Required fields missing.");
      }
      if (!data.finances_confirmed) {
        throw new Error("Financial confirmation required.");
      }
      const response = await submitForm(school, "International Application", data);
      onSuccess(response);
      setData(INITIAL_ADMISSION);
    } catch (e: any) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }, [school, data, setBusy, onSuccess, onError]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">International Admission</h2>
      <p className="text-sm text-slate-500 mb-6">F-1 visa applicants. $50 fee handled separately.</p>
      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label req>First name</Label>
            <Input name="first_name" value={data.first_name} onChange={(e) => onChange("first_name", e.target.value)} />
          </div>
          <div>
            <Label req>Last name</Label>
            <Input name="last_name" value={data.last_name} onChange={(e) => onChange("last_name", e.target.value)} />
          </div>
        </div>

        <div>
          <Label req>Email</Label>
          <Input name="email" type="email" value={data.email} onChange={(e) => onChange("email", e.target.value)} />
        </div>

        <div>
          <Label>Date of Birth (optional)</Label>
          <Input name="dob" type="date" value={data.dob} onChange={(e) => onChange("dob", e.target.value)} />
        </div>

        <div>
          <Label req>Intended Term</Label>
          <Select name="intended_term" value={data.intended_term} onChange={(e) => onChange("intended_term", e.target.value)}>
            <option value="">Select...</option>
            <option>Fall 2025</option>
            <option>Winter 2026</option>
            <option>Spring 2026</option>
            <option>Summer 2026</option>
          </Select>
        </div>

        <div>
          <Label>Passport Number (optional)</Label>
          <Input name="passport_no" value={data.passport_no} onChange={(e) => onChange("passport_no", e.target.value)} />
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            name="notes"
            value={data.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Anything the admissions team should know?"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="fin_adm"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={data.finances_confirmed}
            onChange={(e) => onChange("finances_confirmed", e.target.checked)}
          />
          <label htmlFor="fin_adm" className="text-sm text-slate-700">
            Confirm financial requirements.
          </label>
        </div>

        <div className="pt-3">
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-400 transition-all shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            {busy ? "Submitting…" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TranscriptRequestForm({ school, busy, setBusy, onSuccess, onError }: ServiceFormProps) {
  const [data, setData] = useState<TranscriptData>(INITIAL_TRANSCRIPT);
  const onChange = (k: keyof TranscriptData, v: any) => setData((d) => ({ ...d, [k]: v }));

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      if (!data.student_id || !data.recipient_email) {
        throw new Error("Student ID and Recipient Email are required.");
      }
      const response = await submitForm(school, "Transcript Request", data);
      onSuccess(response);
      setData(INITIAL_TRANSCRIPT);
    } catch (e: any) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }, [school, data, setBusy, onSuccess, onError]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">Official Transcript Request</h2>
      <p className="text-sm text-slate-500 mb-6">Request transcripts to be sent electronically or by mail.</p>
      <div className="space-y-5">
        <div>
          <Label req>Student ID (ctcLink ID)</Label>
          <Input
            name="student_id"
            value={data.student_id}
            onChange={(e) => onChange("student_id", e.target.value)}
            placeholder="e.g., 9-digit ID"
          />
        </div>
        <div>
          <Label>Recipient Name (Optional)</Label>
          <Input
            name="recipient_name"
            value={data.recipient_name}
            onChange={(e) => onChange("recipient_name", e.target.value)}
            placeholder="Name of person/institution"
          />
        </div>
        <div>
          <Label req>Recipient Email</Label>
          <Input
            name="recipient_email"
            type="email"
            value={data.recipient_email}
            onChange={(e) => onChange("recipient_email", e.target.value)}
            placeholder="Email address to send transcript"
          />
        </div>
        <div>
          <Label>Delivery Method</Label>
          <Select name="delivery_method" value={data.delivery_method} onChange={(e) => onChange("delivery_method", e.target.value)}>
            <option>Electronic (Parchment/NSC)</option>
            <option>Mail</option>
            <option>Hold for Pickup</option>
          </Select>
        </div>
        <div>
          <Label>Notes (Optional)</Label>
          <Textarea
            name="notes"
            value={data.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Any special instructions?"
          />
        </div>

        <div className="pt-3">
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-slate-400 transition-all shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {busy ? "Submitting…" : "Submit Transcript Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children, req = false, className = "" }: { children: React.ReactNode; req?: boolean; className?: string }) {
  return (
    <label className={`text-sm font-medium text-slate-700 block mb-1.5 ${className}`}>
      {children} {req && <span className="text-rose-600">*</span>}
    </label>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${className}`}
    />
  );
}

function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${className}`}
    >
      {children}
    </select>
  );
}

function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${className}`}
    />
  );
}

