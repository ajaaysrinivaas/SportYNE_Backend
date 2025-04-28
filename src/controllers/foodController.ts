// controllers/foodController.ts

import { Request, Response } from "express";
import { FoodService } from "../services/foodService";

const foodService = new FoodService();

/**
 * Parse and validate the 'fields' query parameter.
 */
function parseFields(fields: string | undefined): string[] | undefined {
  if (!fields) return undefined;
  return fields.split(",").map(field => field.trim());
}

/**
 * Parse and sanitize 'limit' and 'offset' query parameters.
 */
function parsePagination(req: Request): { limit: number; offset: number } {
  let limit = parseInt(req.query.limit as string, 10);
  let offset = parseInt(req.query.offset as string, 10);

  // Set default values if parsing fails or values are out of bounds
  if (isNaN(limit) || limit <= 0) limit = 100;
  if (isNaN(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

/**
 * Fetch all food items.
 */
export async function fetchAllFoodItems(req: Request, res: Response): Promise<void> {
  const fieldsParam = req.query.fields as string | undefined;
  const selectedColumns = parseFields(fieldsParam);
  
  const { limit, offset } = parsePagination(req);

  try {
    const foodItems = await foodService.getAllFoodItems(selectedColumns, limit, offset);
    res.status(200).json(foodItems);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * Search for food items by name.
 */
export async function searchFoodItemsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query.query as string | undefined;
  const fieldsParam = req.query.fields as string | undefined;
  const selectedColumns = parseFields(fieldsParam);

  const { limit, offset } = parsePagination(req);

  if (!query) {
    res.status(400).json({ error: "Query parameter 'query' is required." });
    return;
  }

  try {
    const results = await foodService.searchFoodItems(query, selectedColumns, limit, offset);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * Delete a food item by ID.
 */
export async function deleteFoodItemHandler(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID parameter." });
    return;
  }

  try {
    const deletedFood = await foodService.deleteFoodItemById(id);
    if (!deletedFood) {
      res.status(404).json({ error: "Food item not found." });
      return;
    }
    res.status(200).json(deletedFood);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * Fetch Specific Nutrients for a Food Item
 */
export async function fetchNutrientsForFoodHandler(req: Request, res: Response): Promise<void> {
  const { foodId } = req.params;
  const { nutrients } = req.body;

  // Validate foodId
  const parsedFoodId = parseInt(foodId, 10);
  if (isNaN(parsedFoodId)) {
    res.status(400).json({ error: "Invalid foodId parameter." });
    return;
  }

  // Validate nutrients
  if (!Array.isArray(nutrients) || nutrients.length === 0) {
    res.status(400).json({ error: "Nutrients must be a non-empty array." });
    return;
  }

  // Ensure all nutrients are strings
  const invalidNutrients = nutrients.filter(nutrient => typeof nutrient !== 'string');
  if (invalidNutrients.length > 0) {
    res.status(400).json({ error: "All nutrients must be strings." });
    return;
  }

  // Sanitize and validate nutrient keys
  const sanitizedNutrients = nutrients.map(nutrient => nutrient.toString().trim());

  try {
    const nutrientData = await foodService.getNutrientsForFood(parsedFoodId, sanitizedNutrients);
    if (!nutrientData) {
      res.status(404).json({ error: "Food item not found." });
      return;
    }
    res.status(200).json({ nutrients: nutrientData });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

