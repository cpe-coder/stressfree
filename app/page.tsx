"use client";

import {
	Brain,
	Check,
	Clock,
	Copy,
	Lock,
	LogOut,
	Mail,
	Trophy,
	User,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";
type GamePhase = "memorize" | "playing" | "finished";
type AppScreen = "auth" | "lobby" | "waitingRoom" | "game";

interface Card {
	id: number;
	value: string;
	isFlipped: boolean;
	isMatched: boolean;
}

interface UserData {
	email: string;
	username: string;
	highScore: number;
	gamesPlayed: number;
	wins: number;
	losses: number;
}

interface GameRoom {
	roomId: string;
	host: string;
	hostUsername: string;
	hostScore: number;
	guest: string | null;
	guestUsername: string | null;
	guestScore: number;
	status: "waiting" | "playing" | "finished";
	gameMode: string | null;
}

const DIFFICULTIES = {
	easy: { pairs: 6, time: 120, memoryTime: 5 },
	medium: { pairs: 8, time: 90, memoryTime: 4 },
	hard: { pairs: 10, time: 60, memoryTime: 3 },
};

const EMOJIS = [
	"🎮",
	"🎯",
	"🎨",
	"🎭",
	"🎪",
	"🎸",
	"🎺",
	"🎻",
	"🎲",
	"🎰",
	"🏆",
	"🏅",
	"⚽",
	"🏀",
	"🎾",
	"🏐",
];

export default function BrainBreakGame() {
	// Auth state
	const [screen, setScreen] = useState<AppScreen>("auth");
	const [isSignIn, setIsSignIn] = useState(true);
	const [needsVerification, setNeedsVerification] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [authToken, setAuthToken] = useState("");
	const [currentUser, setCurrentUser] = useState<UserData | null>(null);
	const [authError, setAuthError] = useState("");

	// Game state
	const [difficulty, setDifficulty] = useState<Difficulty>("medium");
	const [gamePhase, setGamePhase] = useState<GamePhase>("memorize");
	const [cards, setCards] = useState<Card[]>([]);
	const [room, setRoom] = useState<GameRoom | null>(null);
	const [selectedCards, setSelectedCards] = useState<number[]>([]);
	const [timeLeft, setTimeLeft] = useState(0);
	const [memoryPhase, setMemoryPhase] = useState(true);
	const [copied, setCopied] = useState(false);
	const [isPolling, setIsPolling] = useState(false);

	// Auth handlers
	const handleSignUp = async () => {
		setAuthError("");
		try {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, username, password }),
			});
			const data = await res.json();

			if (res.ok) {
				setNeedsVerification(true);
				alert(
					`Account created! Verification code: ${
						data.verificationCode || "Check your email"
					}`
				);
			} else {
				setAuthError(data.error);
			}
		} catch (err) {
			setAuthError("Network error");
		}
	};

	const handleSignIn = async () => {
		setAuthError("");
		try {
			const res = await fetch("/api/auth/signin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();

			if (res.ok) {
				setAuthToken(data.token);
				setCurrentUser(data.user);
				setScreen("lobby");
			} else if (data.needsVerification) {
				setNeedsVerification(true);
				setAuthError("Please verify your email first");
			} else {
				setAuthError(data.error);
			}
		} catch (err) {
			setAuthError("Network error");
		}
	};

	const handleVerify = async () => {
		setAuthError("");
		try {
			const res = await fetch("/api/auth/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, code: verificationCode }),
			});
			const data = await res.json();

			if (res.ok) {
				setAuthToken(data.token);
				setCurrentUser(data.user);
				setScreen("lobby");
				setNeedsVerification(false);
			} else {
				setAuthError(data.error);
			}
		} catch (err) {
			setAuthError("Network error");
		}
	};

	const handleLogout = () => {
		setAuthToken("");
		setCurrentUser(null);
		setScreen("auth");
		setRoom(null);
	};

	// Game handlers using useCallback to prevent re-declaration issues
	const startGame = useCallback(() => {
		const config = DIFFICULTIES[difficulty];
		const selectedEmojis = EMOJIS.slice(0, config.pairs);
		const cardPairs = [...selectedEmojis, ...selectedEmojis];

		const shuffled = cardPairs
			.map((value, index) => ({
				id: index,
				value,
				isFlipped: true,
				isMatched: false,
			}))
			.sort(() => Math.random() - 0.5);

		setCards(shuffled);
		setGamePhase("memorize");
		setTimeLeft(config.memoryTime);
		setMemoryPhase(true);
		setSelectedCards([]);
		setScreen("game");
	}, [difficulty]);

	const endGame = useCallback(async () => {
		setGamePhase("finished");
		setIsPolling(false);

		if (room && currentUser) {
			const isHost = currentUser.email === room.host;
			const won = isHost
				? room.hostScore > room.guestScore
				: room.guestScore > room.hostScore;
			const myScore = isHost ? room.hostScore : room.guestScore;

			try {
				await fetch("/api/user/stats", {
					method: "PUT",
					headers: {
						Authorization: `Bearer ${authToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ highScore: myScore, won }),
				});
			} catch (err) {
				console.error("Failed to update stats:", err);
			}
		}
	}, [room, currentUser, authToken]);

	const createRoom = async () => {
		try {
			const res = await fetch("/api/multiplayer/create", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();

			if (res.ok) {
				setRoom(data.room);
				setScreen("waitingRoom");
				setIsPolling(true);
			}
		} catch (err) {
			alert("Failed to create room");
		}
	};

	const joinRoom = async () => {
		try {
			const res = await fetch("/api/multiplayer/join", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();

			if (res.ok) {
				setRoom(data.room);
				setScreen("waitingRoom");
				setIsPolling(true);
			} else {
				alert(data.error || "No available rooms");
			}
		} catch (err) {
			alert("Failed to join room");
		}
	};

	const checkMatch = useCallback(
		async (selected: number[], isHost: boolean) => {
			const [first, second] = selected.map(
				(id) => cards.find((c) => c.id === id)!
			);

			setTimeout(async () => {
				if (first.value === second.value) {
					setCards((prev) =>
						prev.map((c) =>
							selected.includes(c.id) ? { ...c, isMatched: true } : c
						)
					);

					if (room) {
						const newScore = isHost
							? room.hostScore + 10
							: room.guestScore + 10;

						try {
							await fetch(`/api/multiplayer/${room.roomId}`, {
								method: "PUT",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(
									isHost ? { hostScore: newScore } : { guestScore: newScore }
								),
							});
						} catch (err) {
							console.error("Failed to update score:", err);
						}
					}

					setSelectedCards([]);

					if (cards.filter((c) => !c.isMatched).length === 2) {
						endGame();
					}
				} else {
					setCards((prev) =>
						prev.map((c) =>
							selected.includes(c.id) ? { ...c, isFlipped: false } : c
						)
					);
					setSelectedCards([]);
				}
			}, 800);
		},
		[cards, room, endGame]
	);

	const handleCardClick = useCallback(
		async (cardId: number) => {
			if (memoryPhase || gamePhase !== "playing" || !room || !currentUser)
				return;

			const isHost = currentUser.email === room.host;
			const isMyTurn = isHost
				? room.hostScore >= room.guestScore
				: room.guestScore >= room.hostScore;

			if (!isMyTurn && selectedCards.length === 0) return;

			const card = cards.find((c) => c.id === cardId);
			if (
				!card ||
				card.isFlipped ||
				card.isMatched ||
				selectedCards.length >= 2
			)
				return;

			setCards((prev) =>
				prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
			);

			const newSelected = [...selectedCards, cardId];
			setSelectedCards(newSelected);

			if (newSelected.length === 2) {
				await checkMatch(newSelected, isHost);
			}
		},
		[
			memoryPhase,
			gamePhase,
			room,
			currentUser,
			selectedCards,
			cards,
			checkMatch,
		]
	);

	const copyRoomId = () => {
		if (room) {
			navigator.clipboard.writeText(room.roomId);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleExitGame = () => {
		if (
			window.confirm(
				"Are you sure you want to exit? Your progress will be lost."
			)
		) {
			setScreen("lobby");
			setRoom(null);
			setIsPolling(false);
			setCards([]);
			setGamePhase("memorize");
			setSelectedCards([]);
			setMemoryPhase(true);
		}
	};

	// Poll room status
	useEffect(() => {
		if (!isPolling || !room) return;

		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/multiplayer/${room.roomId}`);
				const data = await res.json();

				if (res.ok && data.room) {
					setRoom(data.room);

					if (data.room.status === "playing" && screen === "waitingRoom") {
						startGame();
					}
				}
			} catch (err) {
				console.error("Polling error:", err);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isPolling, room, screen, startGame]);

	// Memory phase countdown
	useEffect(() => {
		if (screen !== "game" || gamePhase !== "memorize" || timeLeft <= 0) return;

		const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
		return () => clearTimeout(timer);
	}, [screen, gamePhase, timeLeft]);

	useEffect(() => {
		if (gamePhase === "memorize" && timeLeft === 0) {
			const t = setTimeout(() => {
				setCards((prev) => prev.map((card) => ({ ...card, isFlipped: false })));
				setGamePhase("playing");
				setTimeLeft(DIFFICULTIES[difficulty].time);
				setMemoryPhase(false);
			}, 0);
			return () => clearTimeout(t);
		}
	}, [gamePhase, timeLeft, difficulty]);

	// Game timer
	useEffect(() => {
		if (gamePhase !== "playing" || timeLeft <= 0) return;

		const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
		return () => clearTimeout(timer);
	}, [gamePhase, timeLeft]);

	useEffect(() => {
		if (gamePhase === "playing" && timeLeft === 0) {
			const t = setTimeout(() => {
				endGame();
			}, 0);
			return () => clearTimeout(t);
		}
	}, [gamePhase, timeLeft, endGame]);

	// Auth Screen
	if (screen === "auth") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
				<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl">
					<div className="text-center mb-8">
						<Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
						<h1 className="text-3xl font-bold text-white mb-2">Brain Break</h1>
						<p className="text-purple-200">Multiplayer Memory Challenge</p>
					</div>

					{authError && (
						<div className="bg-red-500/20 border border-red-500 text-red-200 rounded-lg p-3 mb-4">
							{authError}
						</div>
					)}

					{!needsVerification ? (
						<>
							<div className="space-y-4 mb-6">
								<div>
									<label className="text-purple-200 text-sm mb-2 block">
										Email
									</label>
									<div className="relative">
										<Mail className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
										<input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full bg-white/20 text-white placeholder-purple-300 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-400"
											placeholder="your@email.com"
										/>
									</div>
								</div>

								{!isSignIn && (
									<div>
										<label className="text-purple-200 text-sm mb-2 block">
											Username
										</label>
										<div className="relative">
											<User className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
											<input
												type="text"
												value={username}
												onChange={(e) => setUsername(e.target.value)}
												className="w-full bg-white/20 text-white placeholder-purple-300 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-400"
												placeholder="Your username"
											/>
										</div>
									</div>
								)}

								<div>
									<label className="text-purple-200 text-sm mb-2 block">
										Password
									</label>
									<div className="relative">
										<Lock className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
										<input
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="w-full bg-white/20 text-white placeholder-purple-300 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-400"
											placeholder="••••••••"
										/>
									</div>
								</div>
							</div>

							<button
								onClick={isSignIn ? handleSignIn : handleSignUp}
								className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-bold hover:from-purple-600 hover:to-blue-600 transition-all mb-4"
							>
								{isSignIn ? "Sign In" : "Sign Up"}
							</button>

							<button
								onClick={() => setIsSignIn(!isSignIn)}
								className="w-full text-purple-200 hover:text-white transition-colors"
							>
								{isSignIn
									? "Don't have an account? Sign Up"
									: "Already have an account? Sign In"}
							</button>
						</>
					) : (
						<>
							<div className="mb-6">
								<label className="text-purple-200 text-sm mb-2 block">
									Verification Code
								</label>
								<input
									type="text"
									value={verificationCode}
									onChange={(e) => setVerificationCode(e.target.value)}
									className="w-full bg-white/20 text-white text-center text-2xl tracking-widest rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400"
									placeholder="000000"
									maxLength={6}
								/>
							</div>

							<button
								onClick={handleVerify}
								className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-bold hover:from-purple-600 hover:to-blue-600 transition-all mb-4"
							>
								Verify Email
							</button>

							<button
								onClick={() => setNeedsVerification(false)}
								className="w-full text-purple-200 hover:text-white transition-colors"
							>
								Back to Sign In
							</button>
						</>
					)}
				</div>
			</div>
		);
	}

	// Lobby Screen
	if (screen === "lobby" && currentUser) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
				<div className="max-w-4xl mx-auto">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-3xl font-bold text-white">
								Welcome, {currentUser.username}! 👋
							</h1>
							<p className="text-purple-200">
								High Score: {currentUser.highScore} | Games:{" "}
								{currentUser.gamesPlayed}
							</p>
						</div>
						<button
							onClick={handleLogout}
							className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all"
						>
							<LogOut className="w-4 h-4" />
							Logout
						</button>
					</div>

					<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
						<h2 className="text-2xl font-bold text-white mb-6 text-center">
							Select Difficulty
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
							{(Object.keys(DIFFICULTIES) as Difficulty[]).map((diff) => {
								const config = DIFFICULTIES[diff];
								return (
									<button
										key={diff}
										onClick={() => setDifficulty(diff)}
										className={`p-6 rounded-xl transition-all ${
											difficulty === diff
												? "bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg scale-105"
												: "bg-white/20 hover:bg-white/30"
										}`}
									>
										<h3 className="text-xl font-bold text-white capitalize mb-2">
											{diff}
										</h3>
										<div className="text-sm text-purple-100 space-y-1">
											<p>🎯 {config.pairs} pairs</p>
											<p>⏱️ {config.time}s</p>
											<p>🧠 {config.memoryTime}s memory</p>
										</div>
									</button>
								);
							})}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<button
								onClick={createRoom}
								className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all"
							>
								Create Room 🎮
							</button>
							<button
								onClick={joinRoom}
								className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-bold hover:from-blue-600 hover:to-cyan-600 transition-all"
							>
								Join Room 🚀
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Waiting Room
	if (screen === "waitingRoom" && room) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
				<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
					<Users className="w-16 h-16 text-purple-300 mx-auto mb-4 animate-pulse" />
					<h2 className="text-2xl font-bold text-white mb-4">
						{room.guest ? "Game Starting!" : "Waiting for Player..."}
					</h2>

					<div className="bg-white/10 rounded-xl p-4 mb-4">
						<p className="text-purple-200 text-sm mb-2">Room ID</p>
						<div className="flex items-center gap-2">
							<code className="flex-1 bg-black/30 text-white px-4 py-2 rounded-lg font-mono text-sm">
								{room.roomId}
							</code>
							<button
								onClick={copyRoomId}
								className="bg-purple-500 hover:bg-purple-600 p-2 rounded-lg transition-all"
							>
								{copied ? (
									<Check className="w-5 h-5 text-white" />
								) : (
									<Copy className="w-5 h-5 text-white" />
								)}
							</button>
						</div>
					</div>

					<div className="space-y-2 mb-6">
						<div className="bg-green-500/20 border border-green-500 rounded-lg p-3">
							<p className="text-green-200 font-bold">{room.hostUsername}</p>
						</div>
						<div
							className={`border rounded-lg p-3 ${
								room.guest
									? "bg-green-500/20 border-green-500"
									: "bg-white/10 border-white/30"
							}`}
						>
							<p
								className={
									room.guest ? "text-green-200 font-bold" : "text-purple-300"
								}
							>
								{room.guest ? room.guestUsername : "Waiting..."}
							</p>
						</div>
					</div>

					<button
						onClick={() => {
							setScreen("lobby");
							setRoom(null);
							setIsPolling(false);
						}}
						className="w-full bg-red-500/20 border border-red-500 text-red-200 py-2 rounded-lg hover:bg-red-500/30 transition-all"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	// Game Screen
	if (screen === "game" && room && currentUser) {
		const isHost = currentUser.email === room.host;
		const myScore = isHost ? room.hostScore : room.guestScore;
		const opponentScore = isHost ? room.guestScore : room.hostScore;
		const opponentName = isHost ? room.guestUsername : room.hostUsername;
		const isMyTurn = myScore >= opponentScore;

		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
				<div className="max-w-6xl mx-auto">
					{gamePhase === "memorize" && (
						<div className="text-center mb-6">
							<div className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-6 inline-block">
								<h2 className="text-2xl font-bold text-yellow-300 mb-2">
									Memorize!
								</h2>
								<div className="flex items-center justify-center gap-2 text-3xl font-bold text-white">
									<Clock className="w-8 h-8" />
									{timeLeft}s
								</div>
							</div>
						</div>
					)}

					{gamePhase !== "finished" && (
						<>
							<div className="grid grid-cols-2 gap-4 mb-6">
								<div
									className={`bg-white/10 backdrop-blur-lg rounded-xl p-4 transition-all ${
										isMyTurn && !memoryPhase
											? "ring-4 ring-green-400 scale-105"
											: ""
									}`}
								>
									<p className="text-purple-200 text-sm">
										{currentUser.username} (You)
									</p>
									<p className="text-3xl font-bold text-white">{myScore}</p>
									{isMyTurn && !memoryPhase && (
										<p className="text-green-400 text-sm mt-1">Your turn!</p>
									)}
								</div>
								<div
									className={`bg-white/10 backdrop-blur-lg rounded-xl p-4 transition-all ${
										!isMyTurn && !memoryPhase
											? "ring-4 ring-green-400 scale-105"
											: ""
									}`}
								>
									<p className="text-purple-200 text-sm">{opponentName}</p>
									<p className="text-3xl font-bold text-white">
										{opponentScore}
									</p>
									{!isMyTurn && !memoryPhase && (
										<p className="text-green-400 text-sm mt-1">Their turn!</p>
									)}
								</div>
							</div>

							{gamePhase === "playing" && (
								<div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-6 text-center">
									<div className="flex items-center justify-center gap-2">
										<Clock className="w-6 h-6 text-purple-300" />
										<span className="text-2xl font-bold text-white">
											{timeLeft}s
										</span>
									</div>
								</div>
							)}

							<div className="grid grid-cols-4 gap-3">
								{cards.map((card) => (
									<button
										key={card.id}
										onClick={() => handleCardClick(card.id)}
										disabled={card.isMatched || memoryPhase}
										className={`aspect-square rounded-xl text-4xl flex items-center justify-center transition-all ${
											card.isFlipped || card.isMatched
												? "bg-white shadow-lg"
												: "bg-purple-500/50 hover:bg-purple-400/50"
										} ${card.isMatched ? "opacity-50" : ""}`}
									>
										{card.isFlipped || card.isMatched ? card.value : "?"}
									</button>
								))}
							</div>
						</>
					)}

					{gamePhase === "finished" && (
						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
							<Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
							<h2 className="text-3xl font-bold text-white mb-6">Game Over!</h2>

							<div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 mb-6">
								<p className="text-yellow-300 text-lg mb-2">Winner</p>
								<p className="text-4xl font-bold text-white">
									{myScore > opponentScore
										? currentUser.username
										: opponentName}
								</p>
								<p className="text-2xl text-purple-200 mt-2">
									{Math.max(myScore, opponentScore)} points
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-6">
								<div className="bg-white/10 rounded-lg p-4">
									<p className="text-purple-200">{currentUser.username}</p>
									<p className="text-2xl font-bold text-white">{myScore}</p>
								</div>
								<div className="bg-white/10 rounded-lg p-4">
									<p className="text-purple-200">{opponentName}</p>
									<p className="text-2xl font-bold text-white">
										{opponentScore}
									</p>
								</div>
							</div>

							<button
								onClick={() => {
									setScreen("lobby");
									setRoom(null);
								}}
								className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-xl font-bold hover:from-purple-600 hover:to-blue-600 transition-all"
							>
								Back to Lobby 🎮
							</button>
						</div>
					)}
				</div>
			</div>
		);
	}

	return null;
}
