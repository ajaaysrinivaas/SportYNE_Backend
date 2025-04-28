import dotenv from "dotenv";
import { Pool } from "pg";
import { FoodItem } from "../models/foodItem";
import NodeCache from "node-cache";

dotenv.config();

// Initialize PostgreSQL pool
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  ssl: { rejectUnauthorized: false }, // Enable SSL for all environments
});

// Initialize cache with a TTL of 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

export class FoodService {
  private static ALLOWED_FIELDS: string[] = [
    "id", "food_name", "energy_kcal", "energy_kj", "carbohydrate_g", "protein_g",
    "total_fat_g", "dietary_fiber_g", "total_sugars_g", "free_sugars_g", "water_g",
    "sfa_g", "mufa_g", "pufa_g", "cholesterol_mg", "vit_a_mcug_ug", "retinol_mcug",
    "lutein_zeaxanthin_mcug", "carotene_alpha_mcug", "carotene_beta_mcug", "carotenoids_ug",
    "vit_d_mcug", "vit_d2_mcug", "vit_d3_mcug", "vit_k_mcug", "vit_k1_mcug", "vit_k2_mcug",
    "vit_e_mg", "vit_e_added_mg", "vit_c_mg", "thiamin_mg", "riboflavin_mg", "niacin_mg",
    "vit_b6_mg", "vit_b5_mg", "vit_b7_mcug", "folate_dfe_mcug", "folate_food_mcug",
    "folate_total_mcug", "folic_acid_mcug", "vit_b12_mcug", "vit_b12_added_mcug",
    "choline_mg", "calcium_mg", "phosphorus_mg", "magnesium_mg", "sodium_mg",
    "potassium_mg", "iron_mg", "zinc_mg", "copper_mg", "selenium_mcug",
    "chromium_mg", "manganese_mg", "molybdenum_mg", "theobromine_mg",
    "lycopene_mcug", "cryptoxanthin_beta_mcug", "alcohol_g", "caffeine_mg"
  ];

  /**
   * Validate and sanitize selected fields.
   */
  private validateFields(selectedColumns?: string[]): string[] | undefined {
    if (!selectedColumns || selectedColumns.length === 0) return undefined;
    return selectedColumns.filter(field => FoodService.ALLOWED_FIELDS.includes(field));
  }

  /**
   * Format selected fields into SQL-safe columns with aliases if required.
   */
  private formatColumns(selectedColumns?: string[]): string {
    if (!selectedColumns || selectedColumns.length === 0) return "*";
    return selectedColumns
      .map(column => (column === "food_name" ? `"food_name" AS "name"` : `"${column}"`))
      .join(", ");
  }

  /**
   * Generate a consistent cache key based on sorted query parameters.
   */
  private generateCacheKey(prefix: string, params: any): string {
    const sortedKeys = Object.keys(params).sort();
    const sortedParams = sortedKeys.reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {} as Record<string, any>);
    return `${prefix}_${JSON.stringify(sortedParams)}`;
  }

  /**
   * Fetch all food items with optional column selection, pagination, and caching.
   */
  async getAllFoodItems(
    selectedColumns?: string[],
    limit: number = 100,
    offset: number = 0
  ): Promise<FoodItem[]> {
    const columns = this.formatColumns(selectedColumns);
    const cacheKey = this.generateCacheKey('allFoodItems', { columns, limit, offset });
    const cachedData = cache.get<FoodItem[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const query = `
      SELECT ${columns}
      FROM food_items
      ORDER BY food_name ASC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await pool.query(query, [limit, offset]);
      cache.set(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      console.error("Error fetching all food items:", (error as Error).message);
      throw new Error("Failed to fetch food items.");
    }
  }

  /**
   * Search food items by name with optional column selection, pagination, and caching.
   */
  async searchFoodItems(
    queryStr: string,
    selectedColumns?: string[],
    limit: number = 10,
    offset: number = 0
  ): Promise<FoodItem[]> {
    const columns = this.formatColumns(selectedColumns);
    const cacheKey = this.generateCacheKey('searchFoodItems', { queryStr, columns, limit, offset });
    const cachedData = cache.get<FoodItem[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const sql = `
      SELECT ${columns}
      FROM food_items
      WHERE food_name ILIKE $1
      ORDER BY food_name ASC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await pool.query(sql, [`%${queryStr}%`, limit, offset]);
      cache.set(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      console.error(`Error searching food items with query "${queryStr}":`, (error as Error).message);
      throw new Error("Failed to search food items.");
    }
  }

  /**
   * Delete a food item by ID and invalidate relevant caches.
   */
  async deleteFoodItemById(id: number): Promise<FoodItem | null> {
    const query = `
      DELETE FROM food_items 
      WHERE id = $1 
      RETURNING *
    `;
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length > 0) {
        // Invalidate cache entries related to this food item
        const relevantKeys = cache.keys().filter(key => key.includes(`foodId_${id}`));
        cache.del(relevantKeys);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error deleting food item with ID ${id}:`, (error as Error).message);
      throw new Error("Failed to delete food item.");
    }
  }

  /**
   * Fetch Specific Nutrients for a Food Item
   */
  async getNutrientsForFood(
    foodId: number,
    nutrients: string[]
  ): Promise<{ [key: string]: number } | null> {
    const validNutrients = this.validateFields(nutrients);
    if (!validNutrients || validNutrients.length === 0) {
      throw new Error("No valid nutrients provided.");
    }

    const cacheKey = this.generateCacheKey('nutrientsForFood', { foodId, nutrients: validNutrients });
    const cachedData = cache.get<{ [key: string]: number }>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const columns = validNutrients.map(n => `"${n}"`).join(", ");
    const query = `
      SELECT ${columns}
      FROM food_items
      WHERE id = $1
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [foodId]);
      if (result.rows.length === 0) {
        return null;
      }

      const foodItem = result.rows[0];
      const nutrientData: { [key: string]: number } = {};
      validNutrients.forEach(nutrient => {
        const value = Number(foodItem[nutrient]);
        nutrientData[nutrient] = isNaN(value) ? 0 : value;
      });

      cache.set(cacheKey, nutrientData);
      return nutrientData;
    } catch (error) {
      console.error(`Error fetching nutrients for foodId ${foodId}:`, (error as Error).message);
      throw new Error("Failed to fetch nutrient data.");
    }
  }
}
