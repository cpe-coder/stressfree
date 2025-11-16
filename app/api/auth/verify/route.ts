import { generateToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { email, code } = await req.json();

		if (!email || !code) {
			return NextResponse.json(
				{ error: "Email and code required" },
				{ status: 400 }
			);
		}

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

		if (user.verificationCode !== code) {
			return NextResponse.json(
				{ error: "Invalid verification code" },
				{ status: 400 }
			);
		}

		if (new Date() > new Date(user.verificationExpiry)) {
			return NextResponse.json(
				{ error: "Verification code expired" },
				{ status: 400 }
			);
		}

		await usersCollection.updateOne(
			{ email: email.toLowerCase() },
			{
				$set: { verified: true, lastLogin: new Date() },
				$unset: { verificationCode: "", verificationExpiry: "" },
			}
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
		console.error("Verification error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
