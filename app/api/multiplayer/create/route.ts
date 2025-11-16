import { verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const token = req.headers.get("authorization")?.replace("Bearer ", "");

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const decoded = verifyToken(token) as { email?: string } | null;

		if (!decoded || !decoded.email) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const db = await getDatabase();
		const usersCollection = db.collection("users");
		const roomsCollection = db.collection("rooms");

		const user = await usersCollection.findOne({ email: decoded.email });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const roomId = `room_${Date.now()}`;

		const room = {
			roomId,
			host: user.email,
			hostUsername: user.username,
			hostScore: 0,
			guest: null,
			guestUsername: null,
			guestScore: 0,
			status: "waiting",
			gameMode: null,
			createdAt: new Date(),
		};

		await roomsCollection.insertOne(room);

		return NextResponse.json({ room });
	} catch (error) {
		console.error("Create room error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
