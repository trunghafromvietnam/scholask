"use client";
import { useEffect, useState } from "react";

export default function AdminForms({ params }: { params: { school: string } }) {
  const [forms, setForms] = useState<any[]>([]);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${base}/forms/${params.school}`).then(r=>r.json()).then(setForms).catch(()=>setForms([]));
  }, [params.school]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Forms</h1>
      <p className="text-sm text-gray-600 mb-4">Manage forms available to students/applicants.</p>
      <div className="space-y-3">
        {forms.map((f) => (
          <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="font-semibold">{f.name}</div>
            <div className="text-xs text-gray-500">Fields: {f.schema_json?.fields?.map((x:any)=>x.name).join(", ")}</div>
          </div>
        ))}
        {!forms.length && <div className="text-sm text-gray-500">No forms yet.</div>}
      </div>
    </div>
  );
}
