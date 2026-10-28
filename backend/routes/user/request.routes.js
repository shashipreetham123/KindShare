const express = require("express")
const { ObjectId } = require("mongodb")
const { validateRequest, createRequest, deleteRequest, toRequestJSON } = require("../../services/request")
const { validateReserve, createReserve } = require("../../services/reserve")
const { addHistory } = require("../../services/history")
const { handleServerError, toObjectId } = require("../../services/common")

const router = express.Router()

// GET /api/user/request - Fetches requests categorized for the logged-in user
router.get("/", async (req, res) => {
    try {
        const username = req.user.username.toLowerCase().trim()
        const db = req.app.locals.db
        const requestsCollection = db.collection("requests")
        const productsCollection = db.collection("products")
        const usersCollection = db.collection("users")

        // 1. Requests where logged-in user is the donor (User as Donor)
        const asDonorDocs = await requestsCollection.find({ donorUsername: username }).sort({ requestedOn: -1 }).toArray()

        // 2. Requests where logged-in user is the beneficiary (User as Beneficiary)
        const asBeneficiaryDocs = await requestsCollection.find({ beneficiaryUsername: username }).sort({ requestedOn: -1 }).toArray()

        // Gather all referenced product IDs
        const allDocs = [...asDonorDocs, ...asBeneficiaryDocs]
        const productIds = allDocs.map(d => toObjectId(d.productId)).filter(Boolean)
        const products = productIds.length > 0
            ? await productsCollection.find({ _id: { $in: productIds } }).toArray()
            : []
        const productMap = {}
        products.forEach(p => {
            productMap[String(p._id)] = p
        })

        // Gather usernames to resolve verification status
        const usernames = [...new Set(allDocs.flatMap(d => [d.donorUsername, d.beneficiaryUsername]).filter(Boolean))]
        const users = usernames.length > 0
            ? await usersCollection.find({ username: { $in: usernames } }, { projection: { username: 1, verified: 1 } }).toArray()
            : []
        const userVerifyMap = {}
        users.forEach(u => {
            userVerifyMap[u.username] = !!u.verified
        })

        const enrichRequest = (doc) => {
            const prod = productMap[String(doc.productId)] || null
            return {
                ...toRequestJSON(doc),
                product: prod ? {
                    _id: prod._id,
                    name: prod.name,
                    coverImage: prod.coverImage,
                    available: prod.quantity !== undefined ? prod.quantity : prod.available,
                    description: prod.description
                } : null,
                donorVerified: Boolean(userVerifyMap[doc.donorUsername]),
                beneficiaryVerified: Boolean(userVerifyMap[doc.beneficiaryUsername])
            }
        }

        return res.status(200).json({
            message: "Requests fetched successfully",
            data: {
                asDonor: asDonorDocs.map(enrichRequest),
                asBeneficiary: asBeneficiaryDocs.map(enrichRequest)
            }
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch requests")
    }
})

// POST /api/user/request/:requestId/accept - Donor accepts request -> creates reservation, decrements product stock, removes request
router.post("/:requestId/accept", async (req, res) => {
    try {
        const { requestId } = req.params
        const reqObjectId = toObjectId(requestId)
        if (!reqObjectId) {
            return res.status(400).json({ message: "Invalid request ID", data: null })
        }

        const db = req.app.locals.db
        const requestsCollection = db.collection("requests")
        const reservesCollection = db.collection("reserves")
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        const requestDoc = await requestsCollection.findOne({ _id: reqObjectId })
        if (!requestDoc) {
            return res.status(404).json({ message: "Request not found", data: null })
        }

        // Must be the donor or admin
        const isDonor = requestDoc.donorUsername === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)
        if (!isDonor && !isAdmin) {
            return res.status(403).json({ message: "Only the donor can accept this request", data: null })
        }

        const reserveData = {
            productId: requestDoc.productId,
            beneficiaryUsername: requestDoc.beneficiaryUsername,
            donorUsername: requestDoc.donorUsername,
            quantity: requestDoc.quantity || 1,
            requestedOn: requestDoc.requestedOn
        }

        const validation = await validateReserve(reserveData, productsCollection)
        if (!validation.isValid) {
            return res.status(400).json({
                message: "Cannot accept request: " + validation.errors.join(", "),
                errors: validation.errors
            })
        }

        const reserve = await createReserve(reserveData, reservesCollection, productsCollection)

        // Remove request after successfully creating reserve
        await requestsCollection.deleteOne({ _id: reqObjectId })

        await addHistory({
            username: req.user.username,
            event: "request accept",
            summaryShort: `Accepted request from ${requestDoc.beneficiaryUsername} for ${reserve.quantity} item(s)`,
            summaryLong: `Donor "${req.user.username}" accepted request ID ${requestId}. Created reservation ID ${reserve._id} for beneficiary "${requestDoc.beneficiaryUsername}".`
        }, historyCollection)

        return res.status(200).json({
            message: "Request accepted and moved to Reserves successfully",
            data: reserve
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to accept request")
    }
})

// POST /api/user/request/:requestId/decline - Donor declines request -> removes request and logs history
router.post("/:requestId/decline", async (req, res) => {
    try {
        const { requestId } = req.params
        const reqObjectId = toObjectId(requestId)
        if (!reqObjectId) {
            return res.status(400).json({ message: "Invalid request ID", data: null })
        }

        const db = req.app.locals.db
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        const requestDoc = await requestsCollection.findOne({ _id: reqObjectId })
        if (!requestDoc) {
            return res.status(404).json({ message: "Request not found", data: null })
        }

        const isDonor = requestDoc.donorUsername === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)
        if (!isDonor && !isAdmin) {
            return res.status(403).json({ message: "Only the donor can decline this request", data: null })
        }

        await requestsCollection.deleteOne({ _id: reqObjectId })

        await addHistory({
            username: req.user.username,
            event: "request decline",
            summaryShort: `Declined request from ${requestDoc.beneficiaryUsername}`,
            summaryLong: `Donor "${req.user.username}" declined request ID ${requestId} from beneficiary "${requestDoc.beneficiaryUsername}".`
        }, historyCollection)

        return res.status(200).json({
            message: "Request declined successfully",
            data: { requestId }
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to decline request")
    }
})

router.post("/", async (req, res) => {
    try {
        const { productId, donorUsername, quantity } = req.body
        const beneficiaryUsername = req.body.beneficiaryUsername || req.user.username

        const requestData = {
            productId,
            beneficiaryUsername,
            donorUsername,
            quantity: quantity !== undefined ? Number(quantity) : 1
        }

        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        const validation = await validateRequest(requestData, productsCollection)
        if (!validation.isValid) {
            return res.status(400).json({
                message: "Request validation failed",
                errors: validation.errors
            })
        }

        const request = await createRequest(requestData, requestsCollection)

        await addHistory({
            username: request.beneficiaryUsername,
            event: "request",
            summaryShort: `Requested ${request.quantity} item(s) from ${request.donorUsername}`,
            summaryLong: `Beneficiary "${request.beneficiaryUsername}" requested ${request.quantity} unit(s) of product ID ${request.productId} from donor "${request.donorUsername}". Request ID: ${request._id}`
        }, historyCollection)

        return res.status(201).json({
            message: "Request created successfully",
            data: toRequestJSON(request)
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to create request")
    }
})

router.delete("/", async (req, res) => {
    try {
        const _id = req.body._id || req.query._id
        const productId = req.body.productId || req.query.productId

        if (!_id && !productId) {
            return res.status(400).json({
                message: "Please provide _id or productId to delete the request",
                data: null
            })
        }

        const filter = {}
        if (_id) filter._id = _id
        if (productId) filter.productId = productId

        const db = req.app.locals.db
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        // Retrieve the request document prior to deletion if possible for rich history details
        const existingRequest = await requestsCollection.findOne({
            ...(filter._id ? { _id: (typeof filter._id === "string" && ObjectId.isValid(filter._id)) ? new ObjectId(filter._id) : filter._id } : {}),
            ...(filter.productId ? { productId: (typeof filter.productId === "string" && ObjectId.isValid(filter.productId)) ? new ObjectId(filter.productId) : filter.productId } : {})
        })

        const deleted = await deleteRequest(filter, requestsCollection)

        if (!deleted) {
            return res.status(404).json({
                message: "Request not found or already deleted",
                data: null
            })
        }

        const actor = req.user ? req.user.username : (existingRequest ? existingRequest.beneficiaryUsername : "unknown")
        const reqQty = existingRequest ? existingRequest.quantity : 1
        const reqProdId = existingRequest ? existingRequest.productId : (filter.productId || filter._id)

        await addHistory({
            username: actor,
            event: "request cancel",
            summaryShort: `Cancelled request for product ${reqProdId}`,
            summaryLong: `User "${actor}" cancelled/deleted request for product ID ${reqProdId} (Qty: ${reqQty}).`
        }, historyCollection)

        return res.status(200).json({
            message: "Request cancelled and deleted successfully"
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to delete request")
    }
})

// DELETE /api/user/request/:requestId - Direct cancellation by requestId
router.delete("/:requestId", async (req, res) => {
    try {
        const { requestId } = req.params
        const reqObjectId = toObjectId(requestId)
        if (!reqObjectId) {
            return res.status(400).json({ message: "Invalid request ID", data: null })
        }

        const db = req.app.locals.db
        const requestsCollection = db.collection("requests")
        const historyCollection = db.collection("history")

        const existingRequest = await requestsCollection.findOne({ _id: reqObjectId })
        if (!existingRequest) {
            return res.status(404).json({ message: "Request not found or already deleted", data: null })
        }

        // Beneficiary who created it, or donor, or admin can cancel
        const isBeneficiary = existingRequest.beneficiaryUsername === req.user.username
        const isDonor = existingRequest.donorUsername === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)
        if (!isBeneficiary && !isDonor && !isAdmin) {
            return res.status(403).json({ message: "You are not authorized to cancel this request", data: null })
        }

        await requestsCollection.deleteOne({ _id: reqObjectId })

        await addHistory({
            username: req.user.username,
            event: "request cancel",
            summaryShort: `Cancelled request for product ${existingRequest.productId}`,
            summaryLong: `User "${req.user.username}" cancelled request ID ${requestId} (Qty: ${existingRequest.quantity}).`
        }, historyCollection)

        return res.status(200).json({
            message: "Request cancelled successfully",
            data: { requestId }
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to cancel request")
    }
})

module.exports = router
