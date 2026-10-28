const express = require("express");
const { handleServerError } = require("../../services/common");

const router = express.Router();

// GET /api/admin/request - Fetches all requests
router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const requests = await db.collection("requests").find({}).toArray();
        return res.status(200).json({
            message: "All Requests fetched successfully",
            count: requests.length,
            data: requests
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch requests");
    }
});

module.exports = router;
