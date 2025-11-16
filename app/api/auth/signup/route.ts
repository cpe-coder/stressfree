import { generateVerificationCode, hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { email, username, password } = await req.json();

		if (!email || !username || !password) {
			return NextResponse.json(
				{ error: "All fields required" },
				{ status: 400 }
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 }
			);
		}

		if (username.length < 3) {
			return NextResponse.json(
				{ error: "Username must be at least 3 characters" },
				{ status: 400 }
			);
		}

		const db = await getDatabase();
		const usersCollection = db.collection("users");

		const existingUser = await usersCollection.findOne({
			$or: [{ email: email.toLowerCase() }, { username }],
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: "Email or username already exists" },
				{ status: 400 }
			);
		}

		const hashedPassword = await hashPassword(password);
		const verificationCode = generateVerificationCode();
		const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

		const newUser = {
			email: email.toLowerCase(),
			username,
			password: hashedPassword,
			verified: false,
			verificationCode,
			verificationExpiry,
			highScore: 0,
			gamesPlayed: 0,
			wins: 0,
			losses: 0,
			createdAt: new Date(),
		};

		await usersCollection.insertOne(newUser);

		// Send verification email
		await sendVerificationEmail(email, verificationCode, username);

		return NextResponse.json({
			success: true,
			message: "Account created. Please verify your email.",
			verificationCode:
				process.env.NODE_ENV === "development" ? verificationCode : undefined,
		});
	} catch (error) {
		console.error("Signup error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
