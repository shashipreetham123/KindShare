const { ObjectId } = require("mongodb");
const Reserve = require("../models/Reserve");

// Validates reserve data
async function validateReserve(reserveData, productsCollection) {
    const errors = [];

    if (!reserveData) {
        return { isValid: false, errors: ["Reserve data is required"] };
    }

    if (!reserveData.productId) {
        errors.push("Product ID is required");
    } else if (typeof reserveData.productId === "string" && !ObjectId.isValid(reserveData.productId)) {
        errors.push("Invalid Product ID format");
    }

    if (!reserveData.beneficiaryUsername || typeof reserveData.beneficiaryUsername !== "string" || reserveData.beneficiaryUsername.trim().length === 0) {
        errors.push("Beneficiary username is required");
    }

    if (!reserveData.donorUsername || typeof reserveData.donorUsername !== "string" || reserveData.donorUsername.trim().length === 0) {
        errors.push("Donor username is required");
    }

    const requestedQuantity = Number(reserveData.quantity !== undefined ? reserveData.quantity : 1);
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
        errors.push("Reserve quantity must be a number greater than 0");
    }

    // Check if product quantity available is greater than or equal to reserve quantity
    if (productsCollection && reserveData.productId && (typeof reserveData.productId !== "string" || ObjectId.isValid(reserveData.productId))) {
        const prodId = typeof reserveData.productId === "string" ? new ObjectId(reserveData.productId) : reserveData.productId;
        const product = await productsCollection.findOne({ _id: prodId });

        if (!product) {
            errors.push("Product not found");
        } else {
            const productQuantity = product.quantity !== undefined ? product.quantity : product.available;
            if (productQuantity === undefined || productQuantity === null || productQuantity < requestedQuantity) {
                errors.push(`Reserve quantity (${requestedQuantity}) exceeds available product quantity (${productQuantity || 0})`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Converts a Reserve model or object to document for DB insertion
function toReserveDoc(reserve) {
    return {
        productId: typeof reserve.productId === "string" && ObjectId.isValid(reserve.productId)
            ? new ObjectId(reserve.productId)
            : reserve.productId,
        beneficiaryUsername: reserve.beneficiaryUsername ? reserve.beneficiaryUsername.toLowerCase().trim() : "",
        donorUsername: reserve.donorUsername ? reserve.donorUsername.toLowerCase().trim() : "",
        quantity: reserve.quantity !== undefined ? Number(reserve.quantity) : 1,
        requestedOn: reserve.requestedOn instanceof Date ? reserve.requestedOn : new Date(reserve.requestedOn || Date.now()),
        reservedOn: reserve.reservedOn instanceof Date ? reserve.reservedOn : new Date(reserve.reservedOn || Date.now())
    };
}

// Inserts a new reservation into the reserves collection and decrements product quantity
async function createReserve(reserveData, reservesCollection, productsCollection) {
    const productId = typeof reserveData.productId === "string" && ObjectId.isValid(reserveData.productId)
        ? new ObjectId(reserveData.productId)
        : reserveData.productId;

    const reserveQuantity = Number(reserveData.quantity !== undefined ? reserveData.quantity : 1);

    // Decrement product.quantity by reserveQuantity only if product.quantity >= reserveQuantity
    if (productsCollection) {
        const updateResult = await productsCollection.updateOne(
            { _id: productId, quantity: { $gte: reserveQuantity } },
            { $inc: { quantity: -reserveQuantity } }
        );

        if (updateResult.matchedCount === 0) {
            const error = new Error("Product quantity is insufficient for reservation");
            error.statusCode = 400;
            throw error;
        }
    }

    const beneficiaryUsername = reserveData.beneficiaryUsername ? reserveData.beneficiaryUsername.toLowerCase().trim() : "";
    const donorUsername = reserveData.donorUsername ? reserveData.donorUsername.toLowerCase().trim() : "";
    const requestedOn = reserveData.requestedOn ? (reserveData.requestedOn instanceof Date ? reserveData.requestedOn : new Date(reserveData.requestedOn)) : new Date();

    const requestObj = {
        productId,
        beneficiaryUsername,
        donorUsername,
        quantity: reserveQuantity,
        requestedOn
    };

    const reserve = new Reserve(requestObj, reserveQuantity);
    const doc = toReserveDoc(reserve);

    const result = await reservesCollection.insertOne(doc);
    if (result.acknowledged && result.insertedId) {
        reserve._id = result.insertedId;
    }

    return reserve;
}

// Converts a Reserve instance or DB document to JSON-safe object
function toReserveJSON(reserve) {
    return {
        _id: reserve._id,
        productId: reserve.productId,
        beneficiaryUsername: reserve.beneficiaryUsername,
        donorUsername: reserve.donorUsername,
        quantity: reserve.quantity !== undefined ? reserve.quantity : 1,
        requestedOn: reserve.requestedOn,
        reservedOn: reserve.reservedOn
    };
}

// Cancels a reservation: deletes reserve document and increments product quantity
async function cancelReserve(filter, reservesCollection, productsCollection) {
    let query = {};

    if (typeof filter === "string") {
        query._id = ObjectId.isValid(filter) ? new ObjectId(filter) : filter;
    } else if (filter instanceof ObjectId) {
        query._id = filter;
    } else if (typeof filter === "object" && filter !== null) {
        query = { ...filter };
        if (query._id && typeof query._id === "string" && ObjectId.isValid(query._id)) {
            query._id = new ObjectId(query._id);
        }
        if (query.productId && typeof query.productId === "string" && ObjectId.isValid(query.productId)) {
            query.productId = new ObjectId(query.productId);
        }
    }

    // Find and delete the reservation atomically
    const reserveDoc = await reservesCollection.findOneAndDelete(query);
    const deletedReserve = reserveDoc && reserveDoc.value !== undefined ? reserveDoc.value : reserveDoc;

    if (!deletedReserve) {
        return false;
    }

    // Increment product.quantity by the reserved quantity
    if (productsCollection && deletedReserve.productId) {
        const prodId = typeof deletedReserve.productId === "string" && ObjectId.isValid(deletedReserve.productId)
            ? new ObjectId(deletedReserve.productId)
            : deletedReserve.productId;

        const reservedQty = Number(deletedReserve.quantity !== undefined ? deletedReserve.quantity : 1);

        await productsCollection.updateOne(
            { _id: prodId },
            { $inc: { quantity: reservedQty } }
        );
    }

    return true;
}

// Marks a reserve as completed by either beneficiary or donor
async function completeReserve({ _id, productId, username }, reservesCollection, productsCollection, requestsCollection) {
    let query = {};

    if (_id) {
        query._id = typeof _id === "string" && ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
    }
    if (productId) {
        query.productId = typeof productId === "string" && ObjectId.isValid(productId) ? new ObjectId(productId) : productId;
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Find the reserve
    const reserve = await reservesCollection.findOne(query);
    if (!reserve) {
        const error = new Error("Reserve not found");
        error.statusCode = 404;
        throw error;
    }

    const isBeneficiary = reserve.beneficiaryUsername && reserve.beneficiaryUsername.toLowerCase().trim() === normalizedUsername;
    const isDonor = reserve.donorUsername && reserve.donorUsername.toLowerCase().trim() === normalizedUsername;

    if (!isBeneficiary && !isDonor) {
        const error = new Error("User is neither the beneficiary nor the donor for this reserve");
        error.statusCode = 403;
        throw error;
    }

    let beneficiaryCompleted = !!reserve.beneficiaryCompleted;
    let donorCompleted = !!reserve.donorCompleted;

    if (isBeneficiary) {
        beneficiaryCompleted = true;
    }
    if (isDonor) {
        donorCompleted = true;
    }

    // If both beneficiary and donor have confirmed completion
    if (beneficiaryCompleted && donorCompleted) {
        await reservesCollection.deleteOne({ _id: reserve._id });

        // Post-completion checks:
        if (productsCollection && reserve.productId) {
            const prodId = typeof reserve.productId === "string" && ObjectId.isValid(reserve.productId)
                ? new ObjectId(reserve.productId)
                : reserve.productId;

            const product = await productsCollection.findOne({ _id: prodId });

            if (product) {
                const currentProductQuantity = Number(product.quantity !== undefined ? product.quantity : 0);

                // 1. Delete requests wanting more quantity than product's remaining quantity
                if (requestsCollection) {
                    await requestsCollection.deleteMany({
                        productId: prodId,
                        quantity: { $gt: currentProductQuantity }
                    });
                }

                // 2. If product quantity is zero and no active reserves remain, delete requests and the product
                if (currentProductQuantity === 0) {
                    const activeReservesCount = await reservesCollection.countDocuments({ productId: prodId });

                    if (activeReservesCount === 0) {
                        if (requestsCollection) {
                            await requestsCollection.deleteMany({ productId: prodId });
                        }
                        await productsCollection.deleteOne({ _id: prodId });
                    }
                }
            }
        }

        return {
            isFullyCompleted: true,
            reserve: { ...reserve, beneficiaryCompleted: true, donorCompleted: true }
        };
    } else {
        // Update reserve with the party's completion confirmation
        const updateFields = {};
        if (isBeneficiary) updateFields.beneficiaryCompleted = true;
        if (isDonor) updateFields.donorCompleted = true;

        await reservesCollection.updateOne(
            { _id: reserve._id },
            { $set: updateFields }
        );

        return {
            isFullyCompleted: false,
            reserve: { ...reserve, ...updateFields }
        };
    }
}

module.exports = {
    validateReserve,
    createReserve,
    cancelReserve,
    completeReserve,
    toReserveDoc,
    toReserveJSON
};
