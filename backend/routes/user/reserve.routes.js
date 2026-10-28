const express = require("express")
const { ObjectId } = require("mongodb")
const { validateReserve, createReserve, cancelReserve, completeReserve, toReserveJSON } = require("../../services/reserve")
const { addHistory } = require("../../services/history")
const { handleServerError, toObjectId } = require("../../services/common")

const router = express.Router()

// GET /api/user/reserve - Fetches active reserves categorized for the logged-in user
router.get("/", async (req, res) => {
    try {
        const username = req.user.username.toLowerCase().trim()
        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const usersCollection = db.collection("users")

        // 1. Reserves where logged-in user is the donor (User as Donor)
        const asDonorDocs = await reservesCollection.find({ donorUsername: username }).sort({ reservedOn: -1 }).toArray()

        // 2. Reserves where logged-in user is the beneficiary (User as Beneficiary)
        const asBeneficiaryDocs = await reservesCollection.find({ beneficiaryUsername: username }).sort({ reservedOn: -1 }).toArray()

        // Gather product IDs
        const allDocs = [...asDonorDocs, ...asBeneficiaryDocs]
        const productIds = allDocs.map(d => toObjectId(d.productId)).filter(Boolean)
        const products = productIds.length > 0
            ? await productsCollection.find({ _id: { $in: productIds } }).toArray()
            : []
        const productMap = {}
        products.forEach(p => {
            productMap[String(p._id)] = p
        })

        // Gather usernames to resolve contact and verification details
        const usernames = [...new Set(allDocs.flatMap(d => [d.donorUsername, d.beneficiaryUsername]).filter(Boolean))]
        const users = usernames.length > 0
            ? await usersCollection.find(
                { username: { $in: usernames } },
                { projection: { username: 1, email: 1, phoneNumber: 1, countryCode: 1, address: 1, verified: 1 } }
            ).toArray()
            : []
        const userMap = {}
        users.forEach(u => {
            userMap[u.username] = {
                username: u.username,
                email: u.email || "",
                phoneNumber: u.phoneNumber ? `${u.countryCode ? u.countryCode + " " : ""}${u.phoneNumber}` : "",
                address: u.address || "",
                verified: !!u.verified
            }
        })

        const enrichReserve = (doc) => {
            const prod = productMap[String(doc.productId)] || null
            const donorInfo = userMap[doc.donorUsername] || { username: doc.donorUsername, email: "", phoneNumber: "", address: "", verified: false }
            const beneficiaryInfo = userMap[doc.beneficiaryUsername] || { username: doc.beneficiaryUsername, email: "", phoneNumber: "", address: "", verified: false }
            return {
                ...toReserveJSON(doc),
                donorCompleted: !!doc.donorCompleted,
                beneficiaryCompleted: !!doc.beneficiaryCompleted,
                product: prod ? {
                    _id: prod._id,
                    name: prod.name,
                    coverImage: prod.coverImage,
                    available: prod.quantity !== undefined ? prod.quantity : prod.available,
                    description: prod.description
                } : null,
                donorVerified: donorInfo.verified,
                beneficiaryVerified: beneficiaryInfo.verified,
                donorDetails: donorInfo,
                beneficiaryDetails: beneficiaryInfo
            }
        }

        return res.status(200).json({
            message: "Reserves fetched successfully",
            data: {
                asDonor: asDonorDocs.map(enrichReserve),
                asBeneficiary: asBeneficiaryDocs.map(enrichReserve)
            }
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch reserves")
    }
})

// POST /api/user/reserve/:reserveId/complete - Mark completion by donor or beneficiary
router.post("/:reserveId/complete", async (req, res) => {
    try {
        const { reserveId } = req.params
        const resObjectId = toObjectId(reserveId)
        if (!resObjectId) {
            return res.status(400).json({ message: "Invalid reserve ID", data: null })
        }

        const username = req.user.username
        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        const result = await completeReserve({ _id: resObjectId, username }, reservesCollection, productsCollection, requestsCollection)

        if (result.isFullyCompleted) {
            const beneficiary = result.reserve.beneficiaryUsername
            const donor = result.reserve.donorUsername
            const prodId = result.reserve.productId

            await addHistory({
                username: beneficiary,
                event: "completed",
                summaryShort: `Completed transaction with donor ${donor}`,
                summaryLong: `Reservation ID ${reserveId} for product ID ${prodId} marked as completed by both parties and deleted from reserves.`
            }, historyCollection)

            await addHistory({
                username: donor,
                event: "completed",
                summaryShort: `Completed donation to beneficiary ${beneficiary}`,
                summaryLong: `Reservation ID ${reserveId} for product ID ${prodId} marked as completed by both parties and deleted from reserves.`
            }, historyCollection)

            return res.status(200).json({
                message: "Reserve completed by both parties and deleted successfully.",
                isFullyCompleted: true,
                data: result.reserve
            })
        } else {
            return res.status(200).json({
                message: "Completion recorded. Waiting for the other party's confirmation.",
                isFullyCompleted: false,
                data: result.reserve
            })
        }
    } catch (error) {
        return handleServerError(res, error, "Failed to complete reserve")
    }
})

router.post("/", async (req, res) => {
    try {
        const { productId, beneficiaryUsername, quantity, requestedOn } = req.body
        const donorUsername = req.body.donorUsername || req.user.username

        const reserveData = {
            productId,
            beneficiaryUsername,
            donorUsername,
            quantity: quantity !== undefined ? Number(quantity) : 1,
            requestedOn
        }

        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        const validation = await validateReserve(reserveData, productsCollection)
        if (!validation.isValid) {
            return res.status(400).json({
                message: "Reserve validation failed",
                errors: validation.errors
            })
        }

        const reserve = await createReserve(reserveData, reservesCollection, productsCollection)

        await addHistory({
            username: reserve.donorUsername,
            event: "reserve",
            summaryShort: `Reserved ${reserve.quantity} item(s) for ${reserve.beneficiaryUsername}`,
            summaryLong: `Donor "${reserve.donorUsername}" created reservation of ${reserve.quantity} unit(s) of product ID ${reserve.productId} for beneficiary "${reserve.beneficiaryUsername}". Reserve ID: ${reserve._id}`
        }, historyCollection)

        return res.status(201).json({
            message: "Reserve created successfully",
            data: toReserveJSON(reserve)
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to create reserve")
    }
})

router.delete("/:reserveId", async (req, res) => {
    try {
        const { reserveId } = req.params
        const resObjectId = toObjectId(reserveId)
        if (!resObjectId) {
            return res.status(400).json({
                message: "Invalid reserve ID",
                data: null
            })
        }

        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        const existingReserve = await reservesCollection.findOne({ _id: resObjectId })
        if (!existingReserve) {
            return res.status(404).json({
                message: "Reserve not found or already cancelled",
                data: null
            })
        }

        const cancelled = await cancelReserve({ _id: resObjectId }, reservesCollection, productsCollection)
        if (!cancelled) {
            return res.status(404).json({
                message: "Reserve not found or already cancelled",
                data: null
            })
        }

        const actor = req.user ? req.user.username : (existingReserve.donorUsername || "unknown")
        const resQty = existingReserve.quantity || 1
        const resProdId = existingReserve.productId

        await addHistory({
            username: actor,
            event: "reserve cancel",
            summaryShort: `Cancelled reservation for product ${resProdId}`,
            summaryLong: `User "${actor}" cancelled reservation for product ID ${resProdId} (Qty: ${resQty}). Restored quantity to product inventory.`
        }, historyCollection)

        return res.status(200).json({
            message: "Reserve cancelled successfully. Inventory restored."
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to cancel reserve")
    }
})

router.delete("/", async (req, res) => {
    try {
        const _id = req.body._id || req.query._id
        const productId = req.body.productId || req.query.productId

        if (!_id && !productId) {
            return res.status(400).json({
                message: "Please provide _id or productId to cancel the reserve",
                data: null
            })
        }

        const filter = {}
        if (_id) filter._id = _id
        if (productId) filter.productId = productId

        const db = req.app.locals.db
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        // Retrieve existing reserve prior to cancellation for history
        const existingReserve = await reservesCollection.findOne({
            ...(filter._id ? { _id: (typeof filter._id === "string" && ObjectId.isValid(filter._id)) ? new ObjectId(filter._id) : filter._id } : {}),
            ...(filter.productId ? { productId: (typeof filter.productId === "string" && ObjectId.isValid(filter.productId)) ? new ObjectId(filter.productId) : filter.productId } : {})
        })

        const cancelled = await cancelReserve(filter, reservesCollection, productsCollection)

        if (!cancelled) {
            return res.status(404).json({
                message: "Reserve not found or already cancelled",
                data: null
            })
        }

        const actor = req.user ? req.user.username : (existingReserve ? existingReserve.donorUsername : "unknown")
        const resQty = existingReserve ? existingReserve.quantity : 1
        const resProdId = existingReserve ? existingReserve.productId : (filter.productId || filter._id)

        await addHistory({
            username: actor,
            event: "reserve cancel",
            summaryShort: `Cancelled reservation for product ${resProdId}`,
            summaryLong: `User "${actor}" cancelled reservation for product ID ${resProdId} (Qty: ${resQty}). Restored quantity to product inventory.`
        }, historyCollection)

        return res.status(200).json({
            message: "Reserve cancelled successfully"
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to cancel reserve")
    }
})

module.exports = router
