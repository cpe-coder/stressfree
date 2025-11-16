import { verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const token = req.headers.get("authorization")?.replace("Bearer ", "");

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const decoded = verifyToken(token) as { email: string };

		if (!decoded) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const db = await getDatabase();
		const usersCollection = db.collection("users");
		const roomsCollection = db.collection("rooms");

		const user = await usersCollection.findOne({ email: decoded.email });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const availableRoom = await roomsCollection.findOne({
			status: "waiting",
			guest: null,
			host: { $ne: user.email },
		});

		if (!availableRoom) {
			return NextResponse.json(
				{ error: "No available rooms" },
				{ status: 404 }
			);
		}

		await roomsCollection.updateOne(
			{ roomId: availableRoom.roomId },
			{
				$set: {
					guest: user.email,
					guestUsername: user.username,
					status: "playing",
				},
			}
		);

		const updatedRoom = await roomsCollection.findOne({
			roomId: availableRoom.roomId,
		});

		return NextResponse.json({ room: updatedRoom });
	} catch (error) {
		console.error("Join room error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
