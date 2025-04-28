// routes/driveRoutes.ts
import express from "express";
import {
  fetchRootStructure,
  fetchFolderContentsByTopic,
  fetchGoogleDocAsHTML,
  invalidateCache,
  refreshCacheHandler,
  searchFiles,
} from "../controllers/driveController";

const router = express.Router();

router.get("/structure", fetchRootStructure);
router.get("/folder/:folderId", fetchFolderContentsByTopic);
router.get("/file/html/:fileId", fetchGoogleDocAsHTML);
router.post("/invalidate-cache", invalidateCache);
router.post("/refresh-cache", refreshCacheHandler);
router.get("/search", searchFiles);

export default router;
