import { generateVerificationCode } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json();

		const db = await getDatabase();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ email: email.toLowerCase() });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (user.verified) {
			return NextResponse.json(
				{ error: "Email already verified" },
				{ status: 400 }
			);
		}

		const newCode = generateVerificationCode();
		const newExpiry = new Date(Date.now() + 15 * 60 * 1000);

		await usersCollection.updateOne(
			{ email: email.toLowerCase() },
			{ $set: { verificationCode: newCode, verificationExpiry: newExpiry } }
		);

		await sendVerificationEmail(email, newCode, user.username);

		return NextResponse.json({
			success: true,
			verificationCode:
				process.env.NODE_ENV === "development" ? newCode : undefined,
		});
	} catch (error) {
		console.error("Resend error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
