import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
})

export const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|auth|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|hadracha-logo.png|icon.svg|icon-192.png|icon-512.png|apple-icon.png|placeholder.svg|placeholder-logo.svg).*)",
    ],
}

