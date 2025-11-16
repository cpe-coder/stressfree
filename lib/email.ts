export async function sendVerificationCodeDirect(email: string, code: string) {
	console.log(`Verification code for ${email}: ${code}`);

	return {
		success: true,
		message: "Verification code generated",
		code,
	};
}
