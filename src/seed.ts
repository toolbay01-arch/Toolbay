import { getPayloadSingleton } from "./lib/payload-singleton";

const categories = [
  {
    name: "All",
    slug: "all",
  },
  {
    name: "Building Materials",
    color: "#FF6B35",
    slug: "building-materials",
    subcategories: [
      { name: "Cement & Concrete", slug: "cement-concrete" },
      { name: "Bricks & Blocks", slug: "bricks-blocks" },
      { name: "Sand & Gravel", slug: "sand-gravel" },
      { name: "Steel & Rebar", slug: "steel-rebar" },
      { name: "Roofing Materials", slug: "roofing-materials" },
      { name: "Insulation", slug: "insulation" },
      { name: "Waterproofing", slug: "waterproofing" },
    ],
  },
  {
    name: "Tools & Equipment",
    color: "#4ECDC4",
    slug: "tools-equipment",
    subcategories: [
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Power Tools", slug: "power-tools" },
      { name: "Heavy Machinery", slug: "heavy-machinery" },
      { name: "Safety Equipment", slug: "safety-equipment" },
      { name: "Measuring Tools", slug: "measuring-tools" },
      { name: "Ladders & Scaffolding", slug: "ladders-scaffolding" },
    ],
  },
  {
    name: "Electrical & Lighting",
    color: "#FFE66D",
    slug: "electrical-lighting",
    subcategories: [
      { name: "Cables & Wires", slug: "cables-wires" },
      { name: "Switches & Sockets", slug: "switches-sockets" },
      { name: "Circuit Breakers", slug: "circuit-breakers" },
      { name: "LED Lights", slug: "led-lights" },
      { name: "Solar Equipment", slug: "solar-equipment" },
      { name: "Electrical Tools", slug: "electrical-tools" },
    ],
  },
  {
    name: "Plumbing & Water",
    color: "#457B9D",
    slug: "plumbing-water",
    subcategories: [
      { name: "Pipes & Fittings", slug: "pipes-fittings" },
      { name: "Valves & Taps", slug: "valves-taps" },
      { name: "Water Pumps", slug: "water-pumps" },
      { name: "Water Tanks", slug: "water-tanks" },
      { name: "Bathroom Fixtures", slug: "bathroom-fixtures" },
      { name: "Drainage Systems", slug: "drainage-systems" },
    ],
  },
  {
    name: "Finishing Materials",
    color: "#A8DADC",
    slug: "finishing-materials",
    subcategories: [
      { name: "Paint & Coatings", slug: "paint-coatings" },
      { name: "Tiles & Ceramics", slug: "tiles-ceramics" },
      { name: "Flooring", slug: "flooring" },
      { name: "Doors & Windows", slug: "doors-windows" },
      { name: "Hardware & Fittings", slug: "hardware-fittings" },
      { name: "Glass & Mirrors", slug: "glass-mirrors" },
    ],
  },
  {
    name: "HVAC & Ventilation",
    color: "#F1FAEE",
    slug: "hvac-ventilation",
    subcategories: [
      { name: "Air Conditioners", slug: "air-conditioners" },
      { name: "Fans & Ventilators", slug: "fans-ventilators" },
      { name: "Ductwork", slug: "ductwork" },
      { name: "Heating Systems", slug: "heating-systems" },
    ],
  },
  {
    name: "Garden & Landscaping",
    color: "#2D6A4F",
    slug: "garden-landscaping",
    subcategories: [
      { name: "Lawn & Garden Tools", slug: "lawn-garden-tools" },
      { name: "Irrigation Systems", slug: "irrigation-systems" },
      { name: "Outdoor Lighting", slug: "outdoor-lighting" },
      { name: "Paving Stones", slug: "paving-stones" },
      { name: "Fencing Materials", slug: "fencing-materials" },
    ],
  },
  {
    name: "Furniture & Fixtures",
    color: "#8B5CF6",
    slug: "furniture-fixtures",
    subcategories: [
      { name: "Kitchen Cabinets", slug: "kitchen-cabinets" },
      { name: "Built-in Wardrobes", slug: "built-in-wardrobes" },
      { name: "Office Furniture", slug: "office-furniture" },
      { name: "Outdoor Furniture", slug: "outdoor-furniture" },
    ],
  },
  {
    name: "Other",
    slug: "other",
  },
]

async function seed() {
  console.log("🌱 Seeding database...");

  const payload = await getPayloadSingleton();

  // Create admin tenant with Rwanda-specific fields
  const adminTenant = await payload.create({
    collection: "tenants",
    data: {
      name: "toolbay-admin",
      slug: "toolbay-admin",
      tinNumber: "999000001", // Sample admin TIN
      storeManagerId: "ADMIN001",
      category: "retailer" as const,
      location: "Kigali, Rwanda",
      contactPhone: "+250788888888",
      currency: "RWF" as const,
      paymentMethod: "bank_transfer" as const,
      bankName: "Bank of Kigali",
      bankAccountNumber: "4000000000001",
      isVerified: true,
      verificationStatus: "document_verified" as const,
      canAddMerchants: true,
      verifiedAt: new Date().toISOString(),
    },
  });

  // Create admin user
  const adminUser = await payload.create({
    collection: "users",
    data: {
      email: "admin@toolbay.rw",
      password: "demo",
      roles: ["super-admin"],
      username: "admin",
      tenants: [
        {
          tenant: adminTenant.id,
        },
      ],
    },
  });

  // Update admin tenant with verifiedBy field
  await payload.update({
    collection: "tenants",
    id: adminTenant.id,
    data: {
      verifiedBy: adminUser.id,
    },
  });

  for (const category of categories) {
    const parentCategory = await payload.create({
      collection: "categories",
      data: {
        name: category.name,
        slug: category.slug,
        color: category.color,
        parent: null,
      },
    });

    for (const subCategory of category.subcategories || []) {
      await payload.create({
        collection: "categories",
        data: {
          name: subCategory.name,
          slug: subCategory.slug,
          parent: parentCategory.id,
        },
      });
    }
  }
}

try {
  await seed();
  console.log('Seeding completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Error during seeding:', error);
  process.exit(1); // Exit with error code
}
