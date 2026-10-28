const { ObjectId } = require("mongodb");
const Request = require("../models/Request");

// Validates request data
async function validateRequest(requestData, productsCollection) {
    const errors = [];

    if (!requestData.productId) {
        errors.push("Product ID is required");
    } else if (typeof requestData.productId === "string" && !ObjectId.isValid(requestData.productId)) {
        errors.push("Invalid Product ID format");
    }

    if (!requestData.beneficiaryUsername || typeof requestData.beneficiaryUsername !== "string" || requestData.beneficiaryUsername.trim().length === 0) {
        errors.push("Beneficiary username is required");
    }

    if (!requestData.donorUsername || typeof requestData.donorUsername !== "string" || requestData.donorUsername.trim().length === 0) {
        errors.push("Donor username is required");
    }

    if (
        requestData.beneficiaryUsername &&
        requestData.donorUsername &&
        requestData.beneficiaryUsername.toLowerCase().trim() === requestData.donorUsername.toLowerCase().trim()
    ) {
        errors.push("Beneficiary cannot request their own product");
    }

    const requestedQuantity = Number(requestData.quantity !== undefined ? requestData.quantity : 1);
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
        errors.push("Requested quantity must be a number greater than 0");
    }

    // Check if product quantity available is greater than or equal to requested quantity
    if (productsCollection && requestData.productId && (typeof requestData.productId !== "string" || ObjectId.isValid(requestData.productId))) {
        const prodId = typeof requestData.productId === "string" ? new ObjectId(requestData.productId) : requestData.productId;
        const product = await productsCollection.findOne({ _id: prodId });

        if (!product) {
            errors.push("Product not found");
        } else {
            const productQuantity = product.quantity !== undefined ? product.quantity : product.available;
            if (productQuantity === undefined || productQuantity === null || productQuantity < requestedQuantity) {
                errors.push(`Requested quantity (${requestedQuantity}) exceeds available product quantity (${productQuantity || 0})`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Creates and inserts a Request into the database
async function createRequest(requestData, requestsCollection) {
    const productId = typeof requestData.productId === "string" && ObjectId.isValid(requestData.productId)
        ? new ObjectId(requestData.productId)
        : requestData.productId;

    const beneficiaryUsername = requestData.beneficiaryUsername.toLowerCase().trim();
    const donorUsername = requestData.donorUsername.toLowerCase().trim();
    const quantity = Number(requestData.quantity !== undefined ? requestData.quantity : 1);

    const request = new Request(productId, beneficiaryUsername, donorUsername, quantity);

    const doc = {
        status: request.status,
        productId: request.productId,
        beneficiaryUsername: request.beneficiaryUsername,
        donorUsername: request.donorUsername,
        quantity: request.quantity,
        requestedOn: request.requestedOn
    };

    const result = await requestsCollection.insertOne(doc);
    if (result.acknowledged && result.insertedId) {
        request._id = result.insertedId;
    }

    return request;
}

// Deletes a request by criteria or ID
async function deleteRequest(filter, requestsCollection) {
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

    const result = await requestsCollection.deleteOne(query);
    return result.deletedCount > 0;
}

// Converts a Request to a JSON-safe response object
function toRequestJSON(request) {
    return {
        _id: request._id,
        status: request.status,
        productId: request.productId,
        beneficiaryUsername: request.beneficiaryUsername,
        donorUsername: request.donorUsername,
        quantity: request.quantity !== undefined ? request.quantity : 1,
        requestedOn: request.requestedOn
    };
}

module.exports = {
    validateRequest,
    createRequest,
    deleteRequest,
    toRequestJSON
};
