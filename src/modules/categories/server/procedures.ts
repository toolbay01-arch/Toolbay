import { Category } from "@/payload-types";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

// Simple in-memory cache for categories (since they don't change often)
type FormattedCategory = {
  subcategories: Category[];
} & Category;

let categoriesCache: FormattedCategory[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const categoriesRouter = createTRPCRouter({
  getMany: baseProcedure.query(async ({ ctx }) => {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return categoriesCache;
    }

    try {
      const data = await ctx.db.find({
        collection: "categories",
        depth: 1, // Populate subcategories, subcategores.[0] will be a type of "Category"
        pagination: false,
        where: {
          parent: {
            exists: false,
          },
        },
        sort: "name"
      });

      const formattedData = data.docs.map((doc) => ({
        ...doc,
        subcategories: (doc.subcategories?.docs ?? []).map((doc) => ({
          // Because of "depth: 1" we are confident "doc" will be a type of "Category"
          ...(doc as Category),
        }))
      }));

      // Cache the result
      categoriesCache = formattedData;
      cacheTimestamp = now;

      return formattedData;
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return cached data if available, even if stale
      if (categoriesCache) {
        return categoriesCache;
      }
      throw error;
    }
  }),
});
