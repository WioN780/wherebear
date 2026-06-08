"use server";

import { prisma } from "@/shared/lib/db";
import bcrypt from "bcryptjs";

export interface RegisterResult {
  success: boolean;
  message: string;
}

/**
 * Registers a new user with email and password.
 */
export async function registerUser(
  formData: FormData,
): Promise<RegisterResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { success: false, message: "Missing required fields" };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters long",
    };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: "Email is already registered" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true, message: "Account created successfully" };
  } catch (err) {
    console.error("Failed to register user:", err);
    return {
      success: false,
      message: "Database error. Please try again later.",
    };
  }
}
