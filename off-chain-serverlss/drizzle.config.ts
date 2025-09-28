import type { Config } from "drizzle-kit";

export default {
	schema: "./src/core/schema.ts",
	out: "./drizzle",
	dialect: "sqlite" as const,
	dbCredentials: {
		databaseId: "cross-chain-dex-db", // Updated for microservices
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "ec9b597fa02615ca6a0e62b7ff35d0cc",
		token: process.env.CLOUDFLARE_API_TOKEN || "placeholder",
	},
} satisfies Config;
