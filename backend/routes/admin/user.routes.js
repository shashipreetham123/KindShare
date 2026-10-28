const express = require("express");
const { createUser, userExists, toUserJSON, getUserByUsername } = require("../../services/user");
const { addHistory } = require("../../services/history");
const { handleServerError, normalizeUsername } = require("../../services/common");
const { registerValidation, requestValidation } = require("../../middleware/validation");

const router = express.Router();

// GET /api/admin/user - Fetches all users (excluding passwords)
router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const users = await db.collection("users").find({}, { projection: { password: 0 } }).toArray();
        return res.status(200).json({
            message: "All Users fetched successfully",
            count: users.length,
            data: users
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to fetch users");
    }
});

// POST /api/admin/user - Creates a user with or without admin privileges
router.post("/", registerValidation, requestValidation, async (req, res) => {
    try {
        const { username, password, type, phoneNumber, countryCode, address, email, isAdmin, verified } = req.body;

        const db = req.app.locals.db;
        const usersCollection = db.collection("users");
        const historyCollection = db.collection("history");

        const exists = await userExists(username, usersCollection);
        if (exists) {
            return res.status(409).json({
                message: "Username already exists",
                data: null
            });
        }

        const user = await createUser({
            username,
            password,
            type,
            phoneNumber,
            countryCode,
            address,
            email,
            isAdmin: Boolean(isAdmin),
            verified: Boolean(verified)
        }, usersCollection);

        await addHistory({
            username: user.username,
            event: "admin create user",
            summaryShort: `User account created by admin (${user.isAdmin ? "Admin" : "Standard"})`,
            summaryLong: `Admin "${req.user.username}" created user "${user.username}" (Type: ${user.type}, Admin: ${user.isAdmin}, Verified: ${user.verified}).`
        }, historyCollection);

        return res.status(201).json({
            message: "User created successfully by admin",
            data: toUserJSON(user)
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to create user");
    }
});

// PUT /api/admin/user/:username/verify - Verifies a user (or toggles via body { verified: boolean })
router.put("/:username/verify", async (req, res) => {
    try {
        const username = normalizeUsername(req.params.username);
        const verifyStatus = req.body.verified !== undefined ? Boolean(req.body.verified) : true;

        const db = req.app.locals.db;
        const usersCollection = db.collection("users");
        const historyCollection = db.collection("history");

        const user = await getUserByUsername(username, usersCollection);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                data: null
            });
        }

        await usersCollection.updateOne(
            { username },
            { $set: { verified: verifyStatus } }
        );

        const eventName = verifyStatus ? "admin verify user" : "admin unverify user";
        await addHistory({
            username,
            event: eventName,
            summaryShort: `Account ${verifyStatus ? "verified" : "unverified"} by admin`,
            summaryLong: `Admin "${req.user.username}" set verification status of user "${username}" to ${verifyStatus}.`
        }, historyCollection);

        return res.status(200).json({
            message: `User ${verifyStatus ? "verified" : "unverified"} successfully`,
            data: {
                username,
                verified: verifyStatus
            }
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to update user verification status");
    }
});

// PUT /api/admin/user/:username/unverify - Explicit endpoint to unverify a user
router.put("/:username/unverify", async (req, res) => {
    try {
        const username = normalizeUsername(req.params.username);

        const db = req.app.locals.db;
        const usersCollection = db.collection("users");
        const historyCollection = db.collection("history");

        const user = await getUserByUsername(username, usersCollection);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                data: null
            });
        }

        await usersCollection.updateOne(
            { username },
            { $set: { verified: false } }
        );

        await addHistory({
            username,
            event: "admin unverify user",
            summaryShort: "Account unverified by admin",
            summaryLong: `Admin "${req.user.username}" revoked verification for user "${username}".`
        }, historyCollection);

        return res.status(200).json({
            message: `User "${username}" unverified successfully`,
            data: {
                username,
                verified: false
            }
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to unverify user");
    }
});

// DELETE /api/admin/user/:username - Deletes user and cascades deletion to products, requests, reserves
router.delete("/:username", async (req, res) => {
    try {
        const targetUsername = normalizeUsername(req.params.username);

        const db = req.app.locals.db;
        const usersCollection = db.collection("users");
        const productsCollection = db.collection("products");
        const requestsCollection = db.collection("requests");
        const reservesCollection = db.collection("reserves");
        const historyCollection = db.collection("history");

        const user = await getUserByUsername(targetUsername, usersCollection);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                data: null
            });
        }

        // Find and cascade delete all products owned by this user
        const userProducts = await productsCollection.find({ username: targetUsername }).toArray();
        const productIds = userProducts.map(p => p._id);

        if (productIds.length > 0) {
            await requestsCollection.deleteMany({ productId: { $in: productIds } });
            await reservesCollection.deleteMany({ productId: { $in: productIds } });
            await productsCollection.deleteMany({ _id: { $in: productIds } });
        }

        // Also clean up any requests and reserves where user was beneficiary or donor
        await requestsCollection.deleteMany({
            $or: [
                { beneficiaryUsername: targetUsername },
                { donorUsername: targetUsername }
            ]
        });
        await reservesCollection.deleteMany({
            $or: [
                { beneficiaryUsername: targetUsername },
                { donorUsername: targetUsername }
            ]
        });

        // Delete user
        await usersCollection.deleteOne({ username: targetUsername });

        await addHistory({
            username: targetUsername,
            event: "admin delete user",
            summaryShort: "User account deleted by admin",
            summaryLong: `Admin "${req.user.username}" deleted user "${targetUsername}" and cascaded deletion across ${userProducts.length} product(s) and associated requests/reserves.`
        }, historyCollection);

        return res.status(200).json({
            message: `User "${targetUsername}" and all associated products, requests, and reserves were deleted successfully`,
            deletedProductsCount: userProducts.length
        });
    } catch (error) {
        return handleServerError(res, error, "Failed to delete user");
    }
});

module.exports = router;
