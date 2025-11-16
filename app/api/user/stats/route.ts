import { verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
	try {
		const token = req.headers.get("authorization")?.replace("Bearer ", "");

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const decoded = verifyToken(token) as { email?: string } | null;

		if (!decoded || !decoded.email) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const { highScore, won } = await req.json();

		const db = await getDatabase();
		const usersCollection = db.collection("users");

		const user = await usersCollection.findOne({ email: decoded.email });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const updateData: {
			$set: Record<string, number>;
			$inc: Record<string, number>;
		} = {
			$set: {},
			$inc: { gamesPlayed: 1 },
		};

		if (highScore > user.highScore) {
			updateData.$set.highScore = highScore;
		}

		if (won === true) {
			updateData.$inc.wins = 1;
		} else if (won === false) {
			updateData.$inc.losses = 1;
		}

		await usersCollection.updateOne({ email: decoded.email }, updateData);

		const updatedUser = await usersCollection.findOne(
			{ email: decoded.email },
			{ projection: { password: 0, verificationCode: 0 } }
		);

		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		console.error("Stats update error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
