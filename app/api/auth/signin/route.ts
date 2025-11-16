import { generateToken, verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password required" },
				{ status: 400 }
			);
		}

		const db = await getDatabase();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ email: email.toLowerCase() });

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const isValidPassword = await verifyPassword(password, user.password);

		if (!isValidPassword) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		if (!user.verified) {
			return NextResponse.json(
				{
					error: "Email not verified",
					needsVerification: true,
					verificationCode:
						process.env.NODE_ENV === "development"
							? user.verificationCode
							: undefined,
				},
				{ status: 403 }
			);
		}

		await usersCollection.updateOne(
			{ email: email.toLowerCase() },
			{ $set: { lastLogin: new Date() } }
		);

		const token = generateToken(user._id.toString(), user.email);

		return NextResponse.json({
			success: true,
			token,
			user: {
				email: user.email,
				username: user.username,
				highScore: user.highScore,
				gamesPlayed: user.gamesPlayed,
				wins: user.wins,
				losses: user.losses,
			},
		});
	} catch (error) {
		console.error("Signin error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
