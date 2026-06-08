import { handlers } from "@/auth";
export const { GET, POST } = handlers;
export const runtime = "nodejs"; // Force Node.js runtime for compatibility with bcrypt
