const express = require("express")
const { getProduct, toProductJSON, validateProduct, createProduct } = require("../../services/product")
const { addHistory } = require("../../services/history")
const { handleServerError, toObjectId } = require("../../services/common")

const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const { username, verified, listedDate, _id, name, sort, search, quantity, minQuantity, offset, limit, page } = req.query
        const userType = req.user && req.user.type
        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const usersCollection = db.collection("users")

        const limitNum = Number(limit) || 12
        let offsetNum = Number(offset)
        if (isNaN(offsetNum) && page) {
            const pageNum = Math.max(1, Number(page) || 1)
            offsetNum = (pageNum - 1) * limitNum
        }
        if (isNaN(offsetNum) || offsetNum < 0) {
            offsetNum = 0
        }

        const cursor = await getProduct({
            username,
            verified,
            userType,
            listedDate,
            _id,
            name,
            sort,
            search,
            quantity: quantity !== undefined ? quantity : minQuantity,
            offset: offsetNum,
            limit: limitNum
        }, productsCollection, usersCollection)

        const total = await cursor.countTotal()
        const products = await cursor.toArray()

        // Fetch verification status of donors for the products
        const donorUsernames = [...new Set(products.map(p => p.username).filter(Boolean))]
        let verifiedMap = {}
        if (donorUsernames.length > 0) {
            const users = await usersCollection.find(
                { username: { $in: donorUsernames } },
                { projection: { username: 1, verified: 1 } }
            ).toArray()
            users.forEach(u => {
                verifiedMap[u.username] = !!u.verified
            })
        }

        const formattedProducts = products.map(p => {
            const json = toProductJSON(p)
            json.verified = Boolean(verifiedMap[p.username])
            return json
        })

        return res.status(200).json({
            message: "Products fetched successfully",
            count: formattedProducts.length,
            total,
            offset: offsetNum,
            limit: limitNum,
            data: formattedProducts
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to search products")
    }
})

// GET /api/user/product/:productId - Gets a specific product checking both productId AND username ownership
router.get("/:productId", async (req, res) => {
    try {
        const { productId } = req.params
        const prodObjectId = toObjectId(productId)

        if (!prodObjectId) {
            return res.status(400).json({
                message: "Valid product ID is required",
                data: null
            })
        }

        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const usersCollection = db.collection("users")

        const product = await productsCollection.findOne({ _id: prodObjectId })
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                data: null
            })
        }

        const isOwner = product.username === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)

        // Check audience accessibility
        if (!isOwner && !isAdmin) {
            const uType = req.user.type ? req.user.type.toLowerCase().trim() : "individual"
            let allowed = false
            if (product.accessLevel === 4) { // everyone
                allowed = true
            } else if (product.accessLevel === 1 && uType === "individual") {
                allowed = true
            } else if (product.accessLevel === 2 && uType === "organization") {
                allowed = true
            } else if (product.accessLevel === 3 && uType === "business") {
                allowed = true
            }

            if (!allowed) {
                return res.status(403).json({
                    message: "You are not authorized to view this product details",
                    data: null
                })
            }
        }

        const formatted = toProductJSON(product)

        // Attach verified status of donor
        const donorUser = await usersCollection.findOne({ username: product.username })
        formatted.verified = Boolean(donorUser && donorUser.verified)

        return res.status(200).json({
            message: "Product fetched successfully",
            data: formatted
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch product")
    }
})

router.post("/", async (req, res) => {
    try {
        const { name, description, quantity, available, coverImage, accessLevel, images, listedAt } = req.body
        const username = req.user.username

        const productData = {
            name,
            description,
            username,
            quantity: quantity !== undefined ? quantity : available,
            coverImage,
            accessLevel,
            images,
            listedAt
        }

        const validation = validateProduct(productData)
        if (!validation.isValid) {
            return res.status(400).json({
                message: "Product validation failed",
                errors: validation.errors
            })
        }

        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        const product = await createProduct(productData, productsCollection)

        await addHistory({
            username: product.username,
            event: "product create",
            summaryShort: `Listed new product "${product.name}" (Qty: ${product.quantity})`,
            summaryLong: `User "${product.username}" listed a new product "${product.name}" with quantity ${product.quantity} and access level ${product.accessLevel}. Product ID: ${product._id}`
        }, historyCollection)

        return res.status(201).json({
            message: "Product created successfully",
            data: toProductJSON(product)
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to create product")
    }
})

// PUT /api/user/product (and /api/user/product/:productId) - Updates an existing product
const handleUpdateProduct = async (req, res) => {
    try {
        const productId = req.params.productId || req.body._id || req.body.productId || req.body.id
        const prodObjectId = toObjectId(productId)

        if (!prodObjectId) {
            return res.status(400).json({
                message: "Valid product ID is required",
                data: null
            })
        }

        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const historyCollection = db.collection("history")

        const existing = await productsCollection.findOne({ _id: prodObjectId })
        if (!existing) {
            return res.status(404).json({
                message: "Product not found",
                data: null
            })
        }

        // Authorization check: User must own the product or be an admin
        const isOwner = existing.username === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "You are not authorized to update this product",
                data: null
            })
        }

        const { name, description, quantity, available, coverImage, accessLevel, images } = req.body

        // Construct update candidate merging existing fields
        const candidateData = {
            name: name !== undefined ? name : existing.name,
            description: description !== undefined ? description : existing.description,
            username: existing.username, // Username is immutable
            quantity: quantity !== undefined ? quantity : available !== undefined ? available : existing.quantity,
            coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
            accessLevel: accessLevel !== undefined ? accessLevel : existing.accessLevel,
            images: images !== undefined ? images : existing.images
        }

        const validation = validateProduct(candidateData)
        if (!validation.isValid) {
            return res.status(400).json({
                message: "Product validation failed",
                errors: validation.errors
            })
        }

        const updateDoc = {
            name: candidateData.name.trim(),
            description: candidateData.description.trim(),
            quantity: Number(candidateData.quantity),
            coverImage: candidateData.coverImage.trim(),
            accessLevel: Number(candidateData.accessLevel),
            images: Array.isArray(candidateData.images) ? candidateData.images : []
        }

        await productsCollection.updateOne(
            { _id: prodObjectId },
            { $set: updateDoc }
        )

        const updated = await productsCollection.findOne({ _id: prodObjectId })

        await addHistory({
            username: req.user.username,
            event: "product update",
            summaryShort: `Updated product "${updated.name}"`,
            summaryLong: `User "${req.user.username}" updated product "${updated.name}" (ID: ${productId}). New quantity: ${updated.quantity}.`
        }, historyCollection)

        return res.status(200).json({
            message: "Product updated successfully",
            data: toProductJSON(updated)
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to update product")
    }
}

router.put("/", handleUpdateProduct)
router.put("/:productId", handleUpdateProduct)

// DELETE /api/user/product (and /api/user/product/:productId) - Deletes a product
const handleDeleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId || req.body._id || req.body.productId || req.body.id || req.query.productId || req.query._id || req.query.id
        const prodObjectId = toObjectId(productId)

        if (!prodObjectId) {
            return res.status(400).json({
                message: "Valid product ID is required",
                data: null
            })
        }

        const db = req.app.locals.db
        const productsCollection = db.collection("products")
        const requestsCollection = db.collection("requests")
        const reservesCollection = db.collection("reserves")
        const historyCollection = db.collection("history")

        const existing = await productsCollection.findOne({ _id: prodObjectId })
        if (!existing) {
            return res.status(404).json({
                message: "Product not found",
                data: null
            })
        }

        // Authorization check: User must own the product or be an admin
        const isOwner = existing.username === req.user.username
        const isAdmin = Boolean(req.user.isAdmin)
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "You are not authorized to delete this product",
                data: null
            })
        }

        // Clean up associated requests and reserves
        if (requestsCollection) {
            await requestsCollection.deleteMany({ productId: prodObjectId })
        }
        if (reservesCollection) {
            await reservesCollection.deleteMany({ productId: prodObjectId })
        }

        await productsCollection.deleteOne({ _id: prodObjectId })

        await addHistory({
            username: req.user.username,
            event: "product delete",
            summaryShort: `Deleted product "${existing.name}"`,
            summaryLong: `User "${req.user.username}" deleted product "${existing.name}" (ID: ${productId}).`
        }, historyCollection)

        return res.status(200).json({
            message: "Product deleted successfully",
            data: { productId }
        })
    } catch (error) {
        return handleServerError(res, error, "Failed to delete product")
    }
}

router.delete("/", handleDeleteProduct)
router.delete("/:productId", handleDeleteProduct)

module.exports = router
