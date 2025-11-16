export interface User {
	_id?: string;
	email: string;
	username: string;
	password: string;
	verified: boolean;
	verificationCode?: string;
	verificationExpiry?: Date;
	highScore: number;
	gamesPlayed: number;
	wins: number;
	losses: number;
	createdAt: Date;
	lastLogin?: Date;
}

export interface GameRoom {
	_id?: string;
	roomId: string;
	host: string;
	hostUsername: string;
	hostScore: number;
	guest: string | null;
	guestUsername: string | null;
	guestScore: number;
	status: "waiting" | "playing" | "finished";
	gameMode: string | null;
	createdAt: Date;
}

export interface Session {
	userId: string;
	email: string;
	username: string;
	token: string;
}
