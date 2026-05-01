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
          "displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount,editorialSummary,types,reviews,priceLevel",
      },
    }
  );
  return response.json();
}

// Format opening hours into a readable string for the prompt
function formatHours(regularOpeningHours: any): string {
  if (!regularOpeningHours?.weekdayDescriptions) return "Not provided";
  return regularOpeningHours.weekdayDescriptions.join(", ");
}

// Pull top 3 reviews and extract just the text
function formatReviews(reviews: any[]): string {
  if (!reviews?.length) return "No reviews available";
  return reviews
    .slice(0, 3)
    .map((r, i) => `Review ${i + 1} (${r.rating}★): "${r.text?.text?.slice(0, 200)}"`)
    .join("\n");
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

  const hoursText = formatHours(details.regularOpeningHours);
  const reviewsText = formatReviews(details.reviews);
  const businessTypes = details.types
    ?.slice(0, 3)
    .map((t: string) => t.replace(/_/g, " "))
    .join(", ");

  const prompt = `You are a professional web copywriter. Based on the following business information, generate compelling, specific website content. Use real details from the reviews and hours — avoid generic filler.

Business Information:
- Name: ${details.displayName?.text}
- Address: ${details.formattedAddress}
- Phone: ${details.nationalPhoneNumber || "Not provided"}
- Business Types: ${businessTypes || "Not provided"}
- Rating: ${details.rating} stars (${details.userRatingCount} reviews)
- Description: ${details.editorialSummary?.text || "Not provided"}
- Hours: ${hoursText}

Customer Reviews (use the language and themes customers mention to inform the copy):
${reviewsText}

Instructions:
- Write the headline and tagline to feel specific to THIS business, not generic
- If hours show 24/7 or emergency availability, highlight that in the subheadline or about section
- Pull real themes from the reviews (e.g. if customers mention "fast response" or "fair pricing", use that)
- Services should reflect the actual business type, not placeholder text
- The CTA should match the business type (e.g. "Call Now" for home services, "Book a Table" for restaurants)

Generate a JSON response with the following structure:
{
  "headline": "A compelling headline (max 10 words)",
  "subheadline": "A supporting subheadline that highlights a key differentiator (max 20 words)",
  "about": "A 2-3 sentence about section using specific details from the business info and reviews",
  "services": ["service 1", "service 2", "service 3", "service 4"],
  "cta": "Call to action button text (max 5 words)",
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
      types: details.types ?? [],
      regularOpeningHours: details.regularOpeningHours ?? null,
    },
    content: generatedContent,
  });
}
