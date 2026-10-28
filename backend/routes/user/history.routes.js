const express = require("express")
const { getHistory, toHistoryJSON } = require("../../services/history")
const { handleServerError } = require("../../services/common")

const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const username = req.user.username
        const { event, startDate, endDate, offset, limit } = req.query

        const db = req.app.locals.db
        const historyCollection = db.collection("history")

        // Build matching count query to know total available records
        const query = { username: username.toLowerCase().trim() }
        if (event) {
            query.event = typeof event === "string" ? { $regex: new RegExp(event, "i") } : event
        }
        if (startDate || endDate) {
            query.date = {}
            if (startDate) query.date.$gte = new Date(startDate)
            if (endDate) query.date.$lte = new Date(endDate)
        }
        const totalCount = await historyCollection.countDocuments(query)

        const historyRecords = await getHistory(
            { username, event, startDate, endDate, offset, limit },
            historyCollection
        )

        // For individual users, provide summaryShort (hide summaryLong)
        const formattedHistory = historyRecords.map(item => toHistoryJSON(item, false))

        const currentOffset = offset !== undefined && !isNaN(Number(offset)) ? Math.max(0, parseInt(offset, 10)) : 0
        const currentLimit = limit !== undefined && !isNaN(Number(limit)) ? Math.max(1, parseInt(limit, 10)) : formattedHistory.length

        return res.status(200).json({
            message: "User history fetched successfully",
            count: formattedHistory.length,
            totalCount,
            offset: currentOffset,
            limit: currentLimit,
            data: formattedHistory
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch history")
    }
})

module.exports = router
