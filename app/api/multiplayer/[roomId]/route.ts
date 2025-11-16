// ============================================
// FILE: app/api/multiplayer/[roomId]/route.ts
// ============================================
import { getDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ roomId: string }> }
) {
	try {
		const { roomId } = await params; // <-- Add await here

		const db = await getDatabase();
		const roomsCollection = db.collection("rooms");
		const room = await roomsCollection.findOne({ roomId });

		if (!room) {
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		return NextResponse.json({ room });
	} catch (error) {
		console.error("Get room error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ roomId: string }> }
) {
	try {
		const { roomId } = await params; // <-- Add await here
		const { hostScore, guestScore, gameMode } = await req.json();

		const db = await getDatabase();
		const roomsCollection = db.collection("rooms");

		const updateData: any = {};
		if (hostScore !== undefined) updateData.hostScore = hostScore;
		if (guestScore !== undefined) updateData.guestScore = guestScore;
		if (gameMode) updateData.gameMode = gameMode;

		await roomsCollection.updateOne({ roomId }, { $set: updateData });

		const updatedRoom = await roomsCollection.findOne({ roomId });
		return NextResponse.json({ room: updatedRoom });
	} catch (error) {
		console.error("Update room error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
