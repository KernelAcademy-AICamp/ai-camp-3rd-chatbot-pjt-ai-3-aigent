import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

export const groqClient = apiKey ? new Groq({ apiKey }) : null;

export const getGroqContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        return (part as { text?: string } | null | undefined)?.text ?? "";
      })
      .join("");
  }
  return "";
};
