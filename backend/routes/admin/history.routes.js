const express = require("express");
const { getHistory, toHistoryJSON } = require("../../services/history");
const { handleServerError } = require("../../services/common");

const router = express.Router();

// GET /api/admin/history - Total history or filtered by query parameters
router.get("/", async (req, res) => {
    try {
        const { username, event, startDate, endDate } = req.query;
        const db = req.app.locals.db;
        const historyCollection = db.collection("history");

        const historyRecords = await getHistory({ username, event, startDate, endDate }, historyCollection);
        const formattedHistory = historyRecords.map(item => toHistoryJSON(item, true));

        return res.status(200).json({
            message: username ? `History records for user "${username}" fetched successfully` : "All History records fetched successfully",
            count: formattedHistory.length,
            data: formattedHistory
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch history");
    }
});

// GET /api/admin/history/:username - Dedicated endpoint to fetch history by username
router.get("/:username", async (req, res) => {
    try {
        const username = req.params.username;
        const { event, startDate, endDate } = req.query;
        const db = req.app.locals.db;
        const historyCollection = db.collection("history");

        const historyRecords = await getHistory({ username, event, startDate, endDate }, historyCollection);
        const formattedHistory = historyRecords.map(item => toHistoryJSON(item, true));

        return res.status(200).json({
            message: `History records for user "${username}" fetched successfully`,
            count: formattedHistory.length,
            data: formattedHistory
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch user history");
    }
});

module.exports = router;
