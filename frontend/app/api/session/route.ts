import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers"; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, role } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ ok: false, error: "Missing or invalid token" }, { status: 400 });
    }
    if (!role || typeof role !== 'string') {
      return NextResponse.json({ ok: false, error: "Missing or invalid role" }, { status: 400 });
    }

    const secure = process.env.NODE_ENV === 'production';

    cookies().set("scholask_jwt", token, { 
      httpOnly: true,       
      sameSite: "lax",      
      secure: secure,       
      path: "/",            
      maxAge: 60 * 60 * 24, 
    });

    cookies().set("scholask_role", role, { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: secure, 
      path: "/",
      maxAge: 60 * 60 * 24, 
    });

    console.log("Session cookies set successfully."); // Server log for debugging
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Error setting session cookies:", error);
    return NextResponse.json({ ok: false, error: "Failed to process request" }, { status: 500 });
  }
}

// --- DELETE: Clear authentication cookies ---
export async function DELETE(req: NextRequest) {
  try {
    // Use Next.js 14 App Router cookies() helper for deleting cookies
    cookies().set("scholask_jwt", "", { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: process.env.NODE_ENV === 'production', 
      path: "/", 
      maxAge: 0 // Expire immediately
    });
    
    cookies().set("scholask_role", "", { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: process.env.NODE_ENV === 'production', 
      path: "/", 
      maxAge: 0 
    });

    console.log("Session cookies cleared."); // Server log for debugging
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Error clearing session cookies:", error);
    return NextResponse.json({ ok: false, error: "Failed to process request" }, { status: 500 });
  }
}
