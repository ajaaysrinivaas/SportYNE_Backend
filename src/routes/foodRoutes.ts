// routes/foodRoutes.ts

import express from "express";
import {
  fetchAllFoodItems,
  searchFoodItemsHandler,
  deleteFoodItemHandler,
  fetchNutrientsForFoodHandler, // Import the new handler
} from "../controllers/foodController";

const router = express.Router();

// Route for fetching all food items with optional field selection and pagination
router.get("/", fetchAllFoodItems);

// Route for searching food items with optional field selection and pagination
router.get("/search", searchFoodItemsHandler);

// Route for deleting a food item by ID
router.delete("/:id", deleteFoodItemHandler);

// New Route: Fetch nutrients for a specific food item
router.post("/:foodId/nutrients", fetchNutrientsForFoodHandler);

export default router;
