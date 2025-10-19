import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/admin/:path*",
    "/:school/apply/:path*",
    "/:school/tracking/:path*",
    "/:school/uploads/:path*",
  ],
};

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const jwt = req.cookies.get("scholask_jwt")?.value;

  // Cho phép vào các trang login mà không cần JWT
  if (pathname === "/admin/login" || pathname === "/signin") {
    return NextResponse.next();
  }

  // Nếu chưa có JWT → chuyển hướng tới login phù hợp
  if (!jwt) {
    if (pathname.startsWith("/admin")) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    // student
    const m = pathname.match(/^\/([^\/]+)/);
    const school = m?.[1] || "";
    const url = new URL("/signin", req.url);
    if (school) url.searchParams.set("school", school);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

