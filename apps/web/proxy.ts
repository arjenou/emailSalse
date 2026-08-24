import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function same(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function proxy(request: NextRequest) {
  const expectedUser = process.env.KYLON_ADMIN_USER;
  const expectedPassword = process.env.KYLON_ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return new NextResponse("管理后台尚未配置访问密码", { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0 && same(decoded.slice(0, separator), expectedUser)
        && same(decoded.slice(separator + 1), expectedPassword)) return NextResponse.next();
    } catch { /* ask for credentials below */ }
  }
  return new NextResponse("需要登录", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Kylon Admin", charset="UTF-8"' }
  });
}

export const config = { matcher: ["/dashboard/:path*", "/api/kylon/:path*"] };
