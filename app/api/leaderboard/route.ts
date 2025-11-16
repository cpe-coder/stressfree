import { getDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const db = await getDatabase();
		const usersCollection = db.collection("users");

		const topUsers = await usersCollection
			.find({ verified: true })
			.sort({ highScore: -1 })
			.limit(10)
			.project({ password: 0, verificationCode: 0 })
			.toArray();

		return NextResponse.json({ users: topUsers });
	} catch (error) {
		console.error("Leaderboard error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
