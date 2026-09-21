import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/invite", "/forgot-password", "/reset-password"];
const PRODUCTION_OFFICE_IP = "122.169.41.202";

const ALLOWED_IPS = (
  process.env.ALLOWED_OFFICE_IPS ??
  (process.env.NODE_ENV === "production" ? PRODUCTION_OFFICE_IP : "")
)
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip");
  return ip?.replace(/^::ffff:/, "") ?? null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (ALLOWED_IPS.length > 0) {
    const ip = clientIp(req);
    if (!ip || !ALLOWED_IPS.includes(ip)) {
      return new NextResponse("Tools is only accessible from the office network.", {
        status: 403,
      });
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
