const express = require("express");
const { toObjectId, handleServerError } = require("../../services/common");
const { addHistory } = require("../../services/history");
const { getProduct, toProductJSON } = require("../../services/product");

const router = express.Router();

// GET /api/admin/product - Fetches products with support for pagination, search, quantity, sorting
router.get("/", async (req, res) => {
    try {
        const { username, verified, listedDate, _id, name, sort, search, quantity, minQuantity, offset, limit, page } = req.query;
        const db = req.app.locals.db;
        const productsCollection = db.collection("products");
        const usersCollection = db.collection("users");

        const limitNum = Number(limit) || 12;
        let offsetNum = Number(offset);
        if (isNaN(offsetNum) && page) {
            const pageNum = Math.max(1, Number(page) || 1);
            offsetNum = (pageNum - 1) * limitNum;
        }
        if (isNaN(offsetNum) || offsetNum < 0) {
            offsetNum = 0;
        }

        const cursor = await getProduct({
            username,
            verified,
            listedDate,
            _id,
            name,
            sort,
            search,
            quantity: quantity !== undefined ? quantity : minQuantity,
            offset: offsetNum,
            limit: limitNum
        }, productsCollection, usersCollection);

        const total = await cursor.countTotal();
        const products = await cursor.toArray();

        // Fetch verification status of donors
        const donorUsernames = [...new Set(products.map(p => p.username).filter(Boolean))];
        let verifiedMap = {};
        if (donorUsernames.length > 0) {
            const users = await usersCollection.find(
                { username: { $in: donorUsernames } },
                { projection: { username: 1, verified: 1 } }
            ).toArray();
            users.forEach(u => {
                verifiedMap[u.username] = !!u.verified;
            });
        }

        const formattedProducts = products.map(p => {
            const json = toProductJSON(p);
            json.verified = Boolean(verifiedMap[p.username]);
            return json;
        });

        return res.status(200).json({
            message: "Products fetched successfully",
            count: formattedProducts.length,
            total,
            offset: offsetNum,
            limit: limitNum,
            data: formattedProducts
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch products");
    }
});

// DELETE /api/admin/product/:productId - Delists a product and deletes active requests and reserves for it
router.delete("/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const prodObjectId = toObjectId(productId);

        if (!prodObjectId) {
            return res.status(400).json({
                message: "Invalid product ID format",
                data: null
            });
        }

        const db = req.app.locals.db;
        const productsCollection = db.collection("products");
        const requestsCollection = db.collection("requests");
        const reservesCollection = db.collection("reserves");
        const historyCollection = db.collection("history");

        const product = await productsCollection.findOne({ _id: prodObjectId });
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                data: null
            });
        }

        // Delete associated requests and reserves
        await requestsCollection.deleteMany({ productId: prodObjectId });
        await reservesCollection.deleteMany({ productId: prodObjectId });

        // Delete product
        await productsCollection.deleteOne({ _id: prodObjectId });

        await addHistory({
            username: product.username,
            event: "admin delist product",
            summaryShort: `Product "${product.name}" delisted by admin`,
            summaryLong: `Admin "${req.user.username}" delisted product ID ${productId} ("${product.name}", owned by "${product.username}") and removed its active requests and reserves.`
        }, historyCollection);

        return res.status(200).json({
            message: `Product "${product.name}" and all associated requests/reserves were delisted successfully`,
            productId
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to delist product");
    }
});

module.exports = router;
