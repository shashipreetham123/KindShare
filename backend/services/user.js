const argon2 = require("argon2");
const User = require("../models/User");

// Normalizes user input fields
function normalizeUser(userData) {
    return {
        ...userData,
        username: userData.username ? userData.username.toLowerCase().trim() : "",
        type: userData.type ? userData.type.toLowerCase().trim() : "",
        email: userData.email ? userData.email.toLowerCase().trim() : ""
    };
}

// Hashes a plaintext password using argon2
async function hashPassword(password) {
    return await argon2.hash(password);
}

// Verifies a plaintext password against a hash
async function verifyPassword(hashedPassword, plainPassword) {
    return await argon2.verify(hashedPassword, plainPassword);
}

// Converts a User model or document to a DB-safe object
function toUserDoc(user) {
    return {
        username: user.username,
        password: user.password,
        type: user.type,
        email: user.email,
        address: user.address,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        isAdmin: !!user.isAdmin,
        verified: !!user.verified
    };
}

// Converts a user object or doc to safe JSON excluding password
function toUserJSON(user) {
    return {
        username: user.username,
        type: user.type,
        email: user.email,
        address: user.address,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        isAdmin: !!user.isAdmin,
        verified: !!user.verified
    };
}

// Creates and saves a new user in the database
async function createUser(userData, usersCollection) {
    const normalized = normalizeUser(userData);
    const hashedPassword = await hashPassword(normalized.password);

    const isAdmin = Boolean(userData.isAdmin);
    const verified = Boolean(userData.verified);

    const user = new User(
        normalized.username,
        hashedPassword,
        normalized.type,
        normalized.phoneNumber,
        normalized.countryCode,
        normalized.address,
        normalized.email,
        undefined,
        isAdmin,
        verified
    );

    const doc = toUserDoc(user);
    const result = await usersCollection.insertOne(doc);

    if (result.acknowledged && result.insertedId) {
        user._id = result.insertedId;
    }

    return user;
}

// Finds a user by username
async function getUserByUsername(username, usersCollection) {
    const normalizedUsername = username.toLowerCase().trim();
    const doc = await usersCollection.findOne({ username: normalizedUsername });

    if (!doc) {
        return null;
    }

    return new User(
        doc.username,
        doc.password,
        doc.type,
        doc.phoneNumber,
        doc.countryCode,
        doc.address,
        doc.email,
        doc._id,
        !!doc.isAdmin,
        !!doc.verified
    );
}

// Checks if a user with the given username exists
async function userExists(username, usersCollection) {
    const normalizedUsername = username.toLowerCase().trim();
    const doc = await usersCollection.findOne({ username: normalizedUsername });
    return !!doc;
}

module.exports = {
    normalizeUser,
    hashPassword,
    verifyPassword,
    toUserDoc,
    toUserJSON,
    createUser,
    getUserByUsername,
    userExists
};