const express = require("express")
const { completeReserve } = require("../../services/reserve")
const { addHistory } = require("../../services/history")
const { handleServerError } = require("../../services/common")

const router = express.Router()

router.post("/", async (req, res) => {
    try {
        const _id = req.body._id || req.query._id
        const productId = req.body.productId || req.query.productId

        if (!_id && !productId) {
            return res.status(400).json({
                message: "Please provide _id or productId of the reserve to mark as completed",
                data: null
            })
        }

        const username = req.user.username
        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        const result = await completeReserve({ _id, productId, username }, reservesCollection, productsCollection, requestsCollection)

        if (result.isFullyCompleted) {
            const beneficiary = result.reserve.beneficiaryUsername
            const donor = result.reserve.donorUsername
            const prodId = result.reserve.productId
            const reserveId = result.reserve._id

            // Record history for beneficiary
            await addHistory({
                username: beneficiary,
                event: "completed",
                summaryShort: `Completed transaction with donor ${donor}`,
                summaryLong: `Reservation ID ${reserveId} for product ID ${prodId} marked as completed by both beneficiary "${beneficiary}" and donor "${donor}".`
            }, historyCollection)

            // Record history for donor
            await addHistory({
                username: donor,
                event: "completed",
                summaryShort: `Completed donation to beneficiary ${beneficiary}`,
                summaryLong: `Reservation ID ${reserveId} for product ID ${prodId} marked as completed by both beneficiary "${beneficiary}" and donor "${donor}".`
            }, historyCollection)

            return res.status(200).json({
                message: "Reserve marked as completed by both beneficiary and donor. Removed from reserves.",
                isFullyCompleted: true,
                data: {
                    _id: result.reserve._id,
                    productId: result.reserve.productId,
                    beneficiaryUsername: result.reserve.beneficiaryUsername,
                    donorUsername: result.reserve.donorUsername,
                    beneficiaryCompleted: true,
                    donorCompleted: true
                }
            })
        } else {
            return res.status(200).json({
                message: "Completion recorded. Waiting for the other party's confirmation.",
                isFullyCompleted: false,
                data: {
                    _id: result.reserve._id,
                    productId: result.reserve.productId,
                    beneficiaryCompleted: !!result.reserve.beneficiaryCompleted,
                    donorCompleted: !!result.reserve.donorCompleted
                }
            })
        }
    } catch (error) {
        return handleServerError(res, error, "Failed to complete reserve")
    }
})

module.exports = router
