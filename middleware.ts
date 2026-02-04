import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
})

export const config = {
    // מחריגים דפים שלא צריכים הגנה
    matcher: ["/((?!api/auth|_next/static|_next/image|auth|favicon.ico).*)"],
}