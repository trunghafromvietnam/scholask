import { jwtDecode } from "jwt-decode"; 

const LS_KEY = "scholask_auth_token";
export const AUTH_EVENT = "scholask:auth-changed";

type AuthPayload = {
  token: string;
  role: string;
  email: string; // Lấy từ payload của token
  school_id: number;
};

type DecodedToken = {
  sub: string; // user_id hoặc email
  role: string;
  school_id: number;
  exp: number;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Lưu trữ token vào localStorage và phát sự kiện
 */
export function setAuth(token: string) {
  if (!isBrowser()) return;
  
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const payload: AuthPayload = {
      token,
      role: decoded.role,
      email: decoded.sub, 
      school_id: decoded.school_id
    };
    
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: payload }));
  } catch (e) {
    console.error("Failed to decode or set auth token:", e);
    clearAuth(); // Xóa token hỏng nếu có
  }
}

/**
 * Lấy dữ liệu auth (bao gồm token, role) từ localStorage
 */
export function getAuth(): AuthPayload | null {
  if (!isBrowser()) return null;
  
  try {
    const data = localStorage.getItem(LS_KEY);
    if (!data) return null;
    
    const payload = JSON.parse(data) as AuthPayload;
    
    // Kiểm tra token hết hạn
    const decoded = jwtDecode<DecodedToken>(payload.token);
    if (decoded.exp * 1000 < Date.now()) {
      console.log("Auth token expired, clearing auth.");
      clearAuth();
      return null;
    }
    
    return payload;
  } catch (e) {
    console.error("Failed to get auth:", e);
    return null;
  }
}

/**
 * Chỉ lấy role (cho UI logic)
 */
export function getRole(): string | null {
  const auth = getAuth();
  return auth ? auth.role : null;
}

/**
 * Chỉ lấy token (cho API headers)
 */
export function getToken(): string | null {
  const auth = getAuth();
  return auth ? auth.token : null;
}

/**
 * Xóa phiên đăng nhập
 */
export async function clearAuth() {
  if (!isBrowser()) return;

  console.log("Attempting to clear authentication..."); // Log

  // Xóa localStorage
  localStorage.removeItem(LS_KEY);
  console.log("Local storage cleared.");

  // Gọi API để xóa HTTPOnly cookies
  try {
    console.log("Calling DELETE /api/session to clear cookies...");
    const response = await fetch("/api/session", { method: "DELETE" });
    if (response.ok) {
      console.log("Session cookies cleared via API.");
    } else {
      console.error("Failed to clear session cookies via API:", response.statusText);
    }
  } catch (error) {
    console.error("Error calling DELETE /api/session:", error);
  }

  // Phát sự kiện để cập nhật UI ngay lập tức
  // Gửi detail là null để báo đã logout
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: null })); 
  console.log("Auth changed event dispatched with null.");
}

/**
 * Tiện ích lấy header xác thực cho các lệnh gọi API
 * Đây là phần quan trọng nhất.
 */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return {
      "Authorization": `Bearer ${token}`
    };
  }
  return {};
}




