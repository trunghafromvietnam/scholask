import { authHeaders } from "./auth";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type SubmitFormResponse = {
  id: number;
  status: string;
  ticket_id?: number | null;
};

/**
 * General API fetch helper with automatic auth header and error handling.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const auth = authHeaders();
  if (auth.Authorization) {
    headers.set("Authorization", auth.Authorization);
  }

  try {
    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        // Try to parse error details from backend JSON response
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      console.error(`API Error (${response.status}) on ${endpoint}: ${errorDetail}`);
      throw new Error(`API Error: ${errorDetail}`);
    }

    if (response.status === 204) {
      return null; // Return null for No Content
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }

    return response;

  } catch (error) {
    console.error(`Network or Fetch Error on ${endpoint}:`, error);
    throw new Error("Network error or failed to fetch from API. Please check your connection.");
  }
}

/**
 * Submits a form to the backend.
 * Assumes backend maps formName to form_id or has a specific endpoint.
 */
export async function submitForm(
  school: string,
  formName: string,
  payload: any
): Promise<SubmitFormResponse> {
  const url = `${baseURL}/forms/submit`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      school_slug: school,
      form_name: formName,
      payload,
    }),
  });

  if (!res.ok) {
    // cố gắng đọc body để log lỗi hữu ích hơn
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {}
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${
        bodyText ? ` - ${bodyText}` : ""
      }`
    );
  }

  // robust JSON parse (đề phòng server trả sai content-type)
  let data: any;
  const ct = res.headers.get("content-type") || "";
  try {
    data = ct.includes("application/json") ? await res.json() : JSON.parse(await res.text());
  } catch (e) {
    throw new Error("Server did not return valid JSON.");
  }

  // ---- NORMALIZE NHIỀU KIỂU TRẢ VỀ KHÁC NHAU ----
  // 1) Kiểu bạn đang có: { id, status, ticket_id }
  if (data && typeof data === "object" && "id" in data && "status" in data) {
    return {
      id: Number(data.id),
      status: String(data.status),
      ticket_id: data.ticket_id ?? null,
    };
  }

  // 2) Một số backend trả { submission_id, status, ticket_id }
  if (data && typeof data === "object" && "submission_id" in data && "status" in data) {
    return {
      id: Number(data.submission_id),
      status: String(data.status),
      ticket_id: data.ticket_id ?? null,
    };
  }

  // 3) Bọc trong { data: {...} }
  if (data && typeof data === "object" && "data" in data && data.data) {
    const d = data.data;
    if ("id" in d && "status" in d) {
      return {
        id: Number(d.id),
        status: String(d.status),
        ticket_id: d.ticket_id ?? null,
      };
    }
  }

  // 4) Bọc trong { submission: {...} }
  if (data && typeof data === "object" && "submission" in data && data.submission) {
    const d = data.submission;
    if ("id" in d && "status" in d) {
      return {
        id: Number(d.id),
        status: String(d.status),
        ticket_id: d.ticket_id ?? null,
      };
    }
  }

  // Nếu không khớp dạng nào:
  console.error("Invalid response structure from POST /forms/submit:", data);
  throw new Error("Received an invalid response after form submission.");
}

/**
 * Sends a question to the RAG backend (/chat/ask).
 */
export async function ask(
  school: string,
  question: string,
  opts: { baseUrl?: string } = {}
) {
  const base = opts.baseUrl || process.env.NEXT_PUBLIC_BACKEND_URL!;
  const res = await fetch(`${base}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ school, question }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ask() failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  if (!data || typeof data.answer !== "string") {
    throw new Error("Invalid /chat/ask response.");
  }
  return data;
}


// Lấy danh sách submission của user
export async function getMySubmissions(schoolSlug: string): Promise<any[]> {
  if (!schoolSlug) throw new Error("School slug required for fetching submissions.");
  console.log(`Fetching submissions for ${schoolSlug}...`); 
  try {
      const submissions = await apiFetch(`/forms/my-submissions?school=${encodeURIComponent(schoolSlug)}`);
      console.log(`Received ${submissions?.length ?? 0} submissions.`); 
      return submissions || []; 
  } catch (error) {
       console.error(`Failed to get submissions for ${schoolSlug}:`, error);
       throw error; 
  }
}

export async function getAdminTicketDetail(schoolSlug: string, ticketId: number): Promise<any> {
  if (!schoolSlug) throw new Error("School slug is required");
  if (!ticketId) throw new Error("Ticket ID is required");
  return apiFetch(`/admin/tickets/${ticketId}?school=${encodeURIComponent(schoolSlug)}`);
}

export async function getAdminTickets(schoolSlug: string, filters: { status?: string, department?: string } = {}): Promise<any[]> {
  if (!schoolSlug) throw new Error("School slug required for fetching admin tickets.");
  console.log(`Fetching admin tickets for ${schoolSlug} with filters:`, filters); // Log
  try {
      const queryParams = new URLSearchParams({ school: schoolSlug });
      if (filters.status && filters.status !== 'All') queryParams.append('status', filters.status);
      if (filters.department && filters.department !== 'All') queryParams.append('department', filters.department);

      const tickets = await apiFetch(`/admin/tickets?${queryParams.toString()}`);
      console.log(`Received ${tickets?.length ?? 0} admin tickets.`); 
      return tickets || [];
  } catch (error) {
      console.error(`Failed to fetch admin tickets for ${schoolSlug}:`, error);
      throw error; 
  }
}

export async function updateAdminTicketStatus(ticketId: number, status: string): Promise<any> {
 if (!ticketId || !status) throw new Error("Ticket ID and new status are required.");
 console.log(`Updating status for ticket ${ticketId} to ${status}...`); 
 try {
    const response = await apiFetch(`/tickets/${ticketId}/status`, {
       method: 'POST',
       body: JSON.stringify({ status })
    });
    console.log(`Status updated successfully for ticket ${ticketId}.`); 
    return response;
 } catch (error) {
    console.error(`Failed to update status for ticket ${ticketId}:`, error);
    throw error;
 }
}

// Gửi tin nhắn vào ticket
export async function sendAdminTicketMessage(ticketId: number, text: string, isInternal = false) {
  if (!text?.trim()) throw new Error("Message cannot be empty.");
  return apiFetch(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, is_internal: isInternal }),
  });
}

// Lấy danh sách các form có sẵn cho trường
export async function listFormsForSchool(schoolSlug: string): Promise<any[]> {
   return apiFetch(`/forms/${schoolSlug}`);
}



// KNOWLEDGE
/**
 * Lấy danh sách các knowledge documents đã ingest cho trường.
 */
export async function listDocuments(schoolSlug: string): Promise<any[]> { 
  try {
    // Gọi endpoint GET /admin/documents?school=slug
    const documents = await apiFetch(`/admin/documents?school=${encodeURIComponent(schoolSlug)}`);
    return documents || []; // Trả về list hoặc mảng rỗng
  } catch (error) {
    console.error(`Failed to list documents for ${schoolSlug}:`, error);
    throw error; // Ném lỗi để component UI xử lý
  }
}

/**
 * Xóa một knowledge document.
 */
export async function deleteDocument(docId: number): Promise<void> {
  try {
    console.log(`Attempting to delete document ${docId} via API...`); 
    const response = await fetch(`${baseURL}/admin/documents/${docId}`, {
      method: 'DELETE',
      headers: authHeaders(), // Gửi token xác thực
    });

    // Kiểm tra status code
    if (response.status === 204) {
      // Thành công, không có body để parse
      console.log(`Document ${docId} deleted successfully (204 No Content).`);
      return; 
    } else if (!response.ok) {
      // Xử lý lỗi từ server (ví dụ: 404 Not Found, 403 Forbidden, 500 Internal Error)
      let errorDetail = `Failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch (e) {
         errorDetail = response.statusText;
      }
      console.error(`Failed to delete document ${docId}: ${errorDetail}`);
      throw new Error(`API Error: ${errorDetail}`);
    } else {
       console.warn(`Delete request for ${docId} returned status ${response.status}, expected 204.`);
       if (response.status >= 200 && response.status < 300) {
          return;
       } else {
          throw new Error(`Unexpected status code ${response.status} after delete.`);
       }
    }
  } catch (error) {
    console.error(`Network or fetch error during delete document ${docId}:`, error);
    throw error; 
  }
}

// Hàm ingest (gọi từ form upload)
export async function ingestDocument(formData: FormData): Promise<any> {
    // Cần một hàm fetch riêng hoặc sửa apiFetch để xử lý FormData
   console.log("Ingesting document via FormData..."); // Log
   const headers = authHeaders(); // Lấy auth header

   try {
     const response = await fetch(`${baseURL}/admin/documents/ingest`, {
        method: "POST",
        headers: headers, // Chỉ cần auth header, không cần Content-Type
        body: formData,
     });

     const resJson = await response.json();
     if (!response.ok) {
        throw new Error(resJson.detail || `Ingest failed (${response.status})`);
     }
     console.log("Ingest successful:", resJson);
     return resJson; // Trả về response từ backend

   } catch (error) {
      console.error("Ingest API call failed:", error);
      throw error;
   }
}

export async function getInsightsSummary(schoolSlug: string): Promise<any> { 
      if (!schoolSlug) throw new Error("School slug is required for insights.");
      console.log(`Fetching insights for ${schoolSlug}...`); 
      try {
          // Use apiFetch helper
          const data = await apiFetch(`/admin/insights/summary?school=${encodeURIComponent(schoolSlug)}`);
          console.log("Insights data received."); 
          return data;
      } catch (error) {
          console.error(`Failed to fetch insights for ${schoolSlug}:`, error);
          throw error; 
      }
  }


