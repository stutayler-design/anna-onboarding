import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "../../src/lib/industries.js";
import { buildSystemPrompt } from "../../src/lib/systemPrompt.js";

const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY
});

const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Content-Type": "application/json"
};

export const handler = async (event) => {
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 204, headers, body: "" };
	}

	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" })
		};
	}

	try {
		const { description } = JSON.parse(event.body);

		if (!description || typeof description !== "string") {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "description is required" })
			};
		}

		const message = await anthropic.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: 256,
			system: buildSystemPrompt(CATEGORIES),
			messages: [{ role: "user", content: description }]
		});

		const text = message.content[0].text.trim();

		if (text === "NEED_MORE_INFO") {
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({ category: "NEED_MORE_INFO" })
			};
		}

		if (CATEGORIES.includes(text)) {
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({ category: text })
			};
		}

		// If the model returned something unexpected, ask for more info
		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({ category: "NEED_MORE_INFO" })
		};
	} catch (err) {
		console.error("Categorise error:", err);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Internal server error" })
		};
	}
};
