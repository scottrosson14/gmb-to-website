import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function searchPlace(query: string) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.types",
      },
      body: JSON.stringify({ textQuery: query }),
    }
  );
  const data = await response.json();
  return data.places?.[0];
}

async function getPlaceDetails(placeId: string) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask":
          "displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount,editorialSummary,types",
      },
    }
  );
  return response.json();
}

export async function POST(request: Request) {
  const { query } = await request.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const place = await searchPlace(query);
  if (!place) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const details = await getPlaceDetails(place.id);

  const prompt = `You are a professional web copywriter. Based on the following business information, generate compelling website content.

Business Information:
- Name: ${details.displayName?.text}
- Address: ${details.formattedAddress}
- Phone: ${details.nationalPhoneNumber || "Not provided"}
- Website: ${details.websiteUri || "Not provided"}
- Rating: ${details.rating} (${details.userRatingCount} reviews)
- Description: ${details.editorialSummary?.text || "Not provided"}
- Business Type: ${details.types?.[0]?.replace(/_/g, " ")}

Generate a JSON response with the following structure:
{
  "headline": "A compelling headline for the business (max 10 words)",
  "subheadline": "A supporting subheadline (max 20 words)",
  "about": "A 2-3 sentence about section describing the business",
  "services": ["service 1", "service 2", "service 3", "service 4"],
  "cta": "A call to action button text (max 5 words)",
  "tagline": "A memorable tagline (max 8 words)"
}

Return ONLY the JSON, no other text.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }

  const cleaned = content.text.replace(/```json\n?|\n?```/g, "").trim();
  const generatedContent = JSON.parse(cleaned);

  return NextResponse.json({
    business: {
      ...details,
      types: details.types ?? [],  // ← explicitly pass types through
    },
    content: generatedContent,
  });
}
