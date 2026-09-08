// Small hardcoded product catalog for the MVP. `reasonTags` are matched
// against category keys / keywords from the analysis so recommendations
// feel connected to the user's results. Structured so a real product
// database can replace this file later without touching the UI.

export type ProductCategory =
  | "cleanser"
  | "moisturizer"
  | "sunscreen"
  | "shampoo"
  | "conditioner"
  | "mascara"
  | "blush"
  | "lip";

export interface MockProduct {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: string;
  emoji: string; // stands in for a product image placeholder
  color?: string; // swatch color for makeup items
  whyRecommended: string;
  reasonTags: string[]; // e.g. ["skin", "hydration"]
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "prod_cleanser_01",
    name: "Gentle Cream Cleanser",
    brand: "Aura Basics",
    category: "cleanser",
    price: "$14",
    emoji: "🧴",
    whyRecommended: "A gentle, non-stripping formula to support your skin's natural glow.",
    reasonTags: ["skin"],
  },
  {
    id: "prod_moisturizer_01",
    name: "Hydra Barrier Moisturizer",
    brand: "Aura Basics",
    category: "moisturizer",
    price: "$22",
    emoji: "🫙",
    whyRecommended: "Lightweight hydration that evens out texture without feeling heavy.",
    reasonTags: ["skin"],
  },
  {
    id: "prod_sunscreen_01",
    name: "Invisible Daily SPF 40",
    brand: "Sunbeam",
    category: "sunscreen",
    price: "$18",
    emoji: "☀️",
    whyRecommended: "Protects your glow and helps prevent uneven tone over time.",
    reasonTags: ["skin"],
  },
  {
    id: "prod_shampoo_01",
    name: "Shine Restore Shampoo",
    brand: "Glosswell",
    category: "shampoo",
    price: "$16",
    emoji: "🧴",
    whyRecommended: "Boosts natural shine and softness for the volume look you're going for.",
    reasonTags: ["hair"],
  },
  {
    id: "prod_conditioner_01",
    name: "Weightless Gloss Conditioner",
    brand: "Glosswell",
    category: "conditioner",
    price: "$16",
    emoji: "🧴",
    whyRecommended: "Adds movement and shine without weighing down face-framing layers.",
    reasonTags: ["hair"],
  },
  {
    id: "prod_mascara_01",
    name: "Lengthen & Lift Mascara",
    brand: "Blink Beauty",
    category: "mascara",
    price: "$12",
    emoji: "💄",
    whyRecommended: "Opens up your eyes with a lightweight, buildable formula.",
    reasonTags: ["eyes", "makeup"],
  },
  {
    id: "prod_blush_01",
    name: "Dewy Cream Blush",
    brand: "Petal",
    category: "blush",
    price: "$19",
    emoji: "🌸",
    color: "#E8899E",
    whyRecommended: "A high-placed flush that lifts your whole face shape.",
    reasonTags: ["face", "makeup"],
  },
  {
    id: "prod_lip_01",
    name: "Your-Lips-But-Better Tint",
    brand: "Petal",
    category: "lip",
    price: "$15",
    emoji: "💋",
    color: "#C4586B",
    whyRecommended: "A natural, buildable tint that enhances your lips' natural color.",
    reasonTags: ["lips", "makeup"],
  },
];

export function productsForCategory(categoryKey: string): MockProduct[] {
  return MOCK_PRODUCTS.filter((p) => p.reasonTags.includes(categoryKey));
}
