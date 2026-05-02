import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Convert a business name + address into a clean URL slug
// e.g. "Starbucks, 1585 Broadway, New York" → "starbucks-1585-broadway-new-york"
function toSlug(name: string, address: string): string {
  const raw = `${name} ${address}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // strip punctuation
    .trim()
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .slice(0, 80);                   // keep URLs reasonable length
}

async function searchPlace(query: string) {
  // First attempt: search as-is
  const attempt = async (textQuery: string) => {
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
        body: JSON.stringify({ textQuery }),
      }
    );
    const data = await response.json();
    return data.places?.[0] ?? null;
  };

  // Try original query first
  let place = await attempt(query);
  if (place) return place;

  // Fallback: append "near me" to nudge Google toward a specific location
  place = await attempt(`${query} near me`);
  if (place) return place;

  // Fallback: append "business" to help with brand-only searches like "Starbucks"
  place = await attempt(`${query} business`);
  return place ?? null;
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

  const prompt = `You are a professional web copywriter. Based on the following business information, generate compelling, highly specific website content. Every field must feel like it was written for THIS business — not a template. Use real names, real details, real themes from reviews.

Business Information:
- Name: ${details.displayName?.text}
- Address: ${details.formattedAddress}
- Phone: ${details.nationalPhoneNumber || "Not provided"}
- Business Types: ${businessTypes || "Not provided"}
- Rating: ${details.rating} stars (${details.userRatingCount} reviews)
- Description: ${details.editorialSummary?.text || "Not provided"}
- Hours: ${hoursText}

Customer Reviews:
${reviewsText}

Instructions:
- Pull real language and themes directly from the reviews (e.g. if customers say "fast response", "fair pricing", "friendly staff" — use those exact phrases)
- If hours show 24/7 or emergency availability, call that out prominently
- Services must reflect the actual business type — no placeholders
- The CTA must match the business (e.g. "Call Now" for contractors, "Book a Table" for restaurants, "Schedule a Visit" for health)
- whyUs items must be specific differentiators grounded in the reviews or business data — not generic claims like "We care about customers"
- The highlight stat should be a real, impressive number pulled from the data (rating count, years in business if inferrable, etc.)
- The highlight label should describe what the stat means (e.g. "5-Star Reviews", "Happy Customers", "Years Serving Brooklyn")
- FAQ questions and answers must be realistic for this specific business type and location

Generate a JSON response with this exact structure:
{
  "headline": "A compelling, business-specific headline (max 10 words)",
  "subheadline": "A supporting subheadline highlighting a real differentiator from the reviews (max 20 words)",
  "about": "2-3 sentences using specific details from the reviews and business info. Mention the neighborhood or city if known.",
  "services": ["specific service 1", "specific service 2", "specific service 3", "specific service 4", "specific service 5", "specific service 6"],
  "cta": "Call to action button text (max 5 words)",
  "tagline": "A memorable, business-specific tagline (max 8 words)",
  "whyUs": [
    { "title": "Short benefit title (3-5 words)", "body": "One sentence explanation grounded in real review themes" },
    { "title": "Short benefit title (3-5 words)", "body": "One sentence explanation grounded in real review themes" },
    { "title": "Short benefit title (3-5 words)", "body": "One sentence explanation grounded in real review themes" }
  ],
  "highlightStat": "A number (e.g. 4.9, 500+, 12)",
  "highlightLabel": "What the stat represents (e.g. 'Star Rating', '5-Star Reviews', 'Years in Business')",
  "faq": [
    { "question": "A realistic customer question for this business type", "answer": "A concise, helpful answer (1-2 sentences)" },
    { "question": "A realistic customer question for this business type", "answer": "A concise, helpful answer (1-2 sentences)" },
    { "question": "A realistic customer question for this business type", "answer": "A concise, helpful answer (1-2 sentences)" }
  ]
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

  const siteData = {
    business: {
      ...details,
      types: details.types ?? [],
      regularOpeningHours: details.regularOpeningHours ?? null,
      reviews: details.reviews ?? [],
    },
    content: generatedContent,
    generatedAt: new Date().toISOString(),
  };

  // Generate slug and handle collisions by appending a short suffix
  const baseSlug = toSlug(
    details.displayName?.text ?? "business",
    details.formattedAddress ?? ""
  );

  // Check if slug already exists — if so, append timestamp suffix
  const existing = await redis.get(`site:${baseSlug}`);
  const slug = existing
    ? `${baseSlug}-${Date.now().toString(36)}`
    : baseSlug;

  // Save to KV — no expiry, sites persist indefinitely
  await redis.set(`site:${slug}`, JSON.stringify(siteData));

  return NextResponse.json({
    slug,
    existingWebsite: details.websiteUri ?? null,
  });
}
