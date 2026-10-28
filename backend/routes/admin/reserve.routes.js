const express = require("express");
const { handleServerError } = require("../../services/common");

const router = express.Router();

// GET /api/admin/reserve - Fetches all reserves
router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const reserves = await db.collection("reserves").find({}).toArray();
        return res.status(200).json({
            message: "All Reserves fetched successfully",
            count: reserves.length,
            data: reserves
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch reserves");
    }
});

module.exports = router;
