const { ObjectId } = require("mongodb");

// Checks if a document exists by key and value
async function exists(key, value, collection) {
    const result = await collection.findOne({ [key]: value });
    return result;
}

// Converts a string or ObjectId to a valid ObjectId or null if invalid
function toObjectId(id) {
    if (!id) return null;
    if (id instanceof ObjectId) return id;
    if (typeof id === "string" && ObjectId.isValid(id)) {
        return new ObjectId(id);
    }
    return null;
}

// Standard error handler response helper that prevents leaking internal server details
function handleServerError(res, error, customMessage = "An error occurred while processing your request") {
    console.error(error);

    // If it's a client error (4xx) with a safe message, return it; otherwise return a generic safe message
    const isClientError = error && error.statusCode && error.statusCode >= 400 && error.statusCode < 500;
    const status = isClientError ? error.statusCode : 500;
    const message = isClientError && error.message ? error.message : customMessage;

    return res.status(status).json({
        message,
        data: null
    });
}

// Normalizes usernames to lowercase and trimmed strings
function normalizeUsername(username) {
    return username ? username.toLowerCase().trim() : "";
}

module.exports = {
    exists,
    toObjectId,
    handleServerError,
    normalizeUsername
};