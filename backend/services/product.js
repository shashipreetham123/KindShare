const { ObjectId } = require("mongodb");
const { access_level } = require("../config/constants");
const Product = require("../models/Product");

// Normalizes product fields
function normalizeProduct(productData) {
    const images = Array.isArray(productData.images)
        ? productData.images.map(image => (typeof image === "string" ? image.toLowerCase().trim() : image))
        : [];

    let listedAt = productData.listedAt;
    if (!listedAt) {
        listedAt = new Date();
    } else if (!(listedAt instanceof Date)) {
        listedAt = new Date(listedAt);
    }

    const rawQuantity = productData.quantity !== undefined ? productData.quantity : productData.available;
    const quantity = Number(rawQuantity);

    return {
        ...productData,
        name: productData.name ? productData.name.trim() : "",
        description: productData.description ? productData.description.trim() : "",
        username: productData.username ? productData.username.toLowerCase().trim() : "",
        quantity: isNaN(quantity) ? rawQuantity : quantity,
        coverImage: productData.coverImage ? productData.coverImage.toLowerCase().trim() : "",
        accessLevel: productData.accessLevel !== undefined ? Number(productData.accessLevel) : access_level.everyone,
        images,
        listedAt
    };
}

// Validates product data before insertion
function validateProduct(productData) {
    const errors = [];

    if (!productData.name || typeof productData.name !== "string" || productData.name.trim().length === 0) {
        errors.push("Product name is required");
    }

    if (!productData.description || typeof productData.description !== "string" || productData.description.trim().length === 0) {
        errors.push("Product description is required");
    }

    if (!productData.username || typeof productData.username !== "string" || productData.username.trim().length === 0) {
        errors.push("Username is required");
    }

    const rawQuantity = productData.quantity !== undefined ? productData.quantity : productData.available;
    const quantityNum = Number(rawQuantity);
    if (rawQuantity === undefined || rawQuantity === null || isNaN(quantityNum)) {
        errors.push("Quantity must be a valid number");
    } else if (quantityNum <= 0) {
        errors.push("Quantity must be a number greater than 0");
    }

    if (!productData.coverImage || typeof productData.coverImage !== "string" || productData.coverImage.trim().length === 0) {
        errors.push("Cover image is required");
    }

    if (productData.accessLevel !== undefined && productData.accessLevel !== null) {
        const allowedLevels = Object.values(access_level);
        if (!allowedLevels.includes(Number(productData.accessLevel))) {
            errors.push(`Invalid access level. Allowed values: ${allowedLevels.join(", ")}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Converts a Product model or object to document for DB insertion
function toProductDoc(product) {
    return {
        name: product.name,
        description: product.description,
        username: product.username,
        quantity: product.quantity,
        coverImage: product.coverImage,
        accessLevel: product.accessLevel,
        images: product.images,
        listedAt: product.listedAt
    };
}

// Inserts a new product into the database
async function createProduct(productData, productsCollection) {
    const normalized = normalizeProduct(productData);

    const product = new Product(
        normalized.name,
        normalized.description,
        normalized.username,
        normalized.quantity,
        normalized.coverImage,
        normalized.accessLevel,
        normalized.images,
        normalized.listedAt
    );

    const doc = toProductDoc(product);
    const result = await productsCollection.insertOne(doc);

    if (result.acknowledged && result.insertedId) {
        product._id = result.insertedId;
    }

    return product;
}

// Gets a product by ID
async function getProductById(id, productsCollection) {
    const query = typeof id === "string" && ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const doc = await productsCollection.findOne(query);

    if (!doc) {
        return null;
    }

    return new Product(
        doc.name,
        doc.description,
        doc.username,
        doc.quantity !== undefined ? doc.quantity : doc.available,
        doc.coverImage,
        doc.accessLevel,
        doc.images,
        doc.listedAt,
        doc._id
    );
}

// Gets products using filters and returns a MongoDB cursor or paginated result
async function getProduct(filters = {}, productsCollection, usersCollection) {
    const query = {};

    // 1) Search Product through name or mongodb id
    if (filters.search) {
        const term = String(filters.search).trim();
        if (ObjectId.isValid(term) && term.length === 24) {
            query.$or = [
                { _id: new ObjectId(term) },
                { name: { $regex: term, $options: "i" } }
            ];
        } else {
            query.name = { $regex: term, $options: "i" };
        }
    } else {
        if (filters._id) {
            if (typeof filters._id === "string" && ObjectId.isValid(filters._id)) {
                query._id = new ObjectId(filters._id);
            } else {
                query._id = filters._id;
            }
        }

        if (filters.name) {
            query.name = { $regex: filters.name.trim(), $options: "i" };
        }
    }

    // 2) Search Products through Username
    if (filters.username) {
        query.username = { $regex: filters.username.toLowerCase().trim(), $options: "i" };
    }

    // 3) Filter by quantity slider (min = 1)
    const minQty = Number(filters.quantity !== undefined ? filters.quantity : filters.minQuantity);
    if (!isNaN(minQty) && minQty > 0) {
        query.quantity = { $gte: minQty };
    }

    // Filter products from verified users only if verified query is passed
    const shouldFilterVerified = filters.verified === true || filters.verified === "true" || filters.verified === 1 || filters.verified === "1";
    if (shouldFilterVerified) {
        const uCollection = usersCollection || (productsCollection && productsCollection.s && productsCollection.s.db ? productsCollection.s.db.collection("users") : null);
        if (uCollection) {
            const verifiedUsers = await uCollection.find({ verified: true }, { projection: { username: 1 } }).toArray();
            const verifiedUsernames = verifiedUsers.map(u => u.username);
            if (query.username) {
                if (typeof query.username === "string" && !verifiedUsernames.includes(query.username)) {
                    query.username = "__non_existent_username__";
                }
            } else {
                query.username = { $in: verifiedUsernames };
            }
        }
    }

    // Compare accessLevel of product with userType
    if (filters.userType) {
        const uType = filters.userType.toLowerCase().trim();
        if (uType === "individual") {
            query.accessLevel = { $in: [access_level.individualOnly, access_level.everyone] };
        } else if (uType === "organization") {
            query.accessLevel = { $in: [access_level.organizationOnly, access_level.everyone] };
        } else if (uType === "business") {
            query.accessLevel = { $in: [access_level.businessOnly, access_level.everyone] };
        } else {
            query.accessLevel = access_level.everyone;
        }
    }

    const sort = {};

    if (filters.sort) {
        const sortVal = String(filters.sort).toLowerCase().trim();
        if (sortVal === "a-z" || sortVal === "name_asc" || sortVal === "asc") {
            sort.name = 1;
        } else if (sortVal === "z-a" || sortVal === "name_desc" || sortVal === "desc") {
            sort.name = -1;
        } else if (sortVal === "latest") {
            sort.listedAt = -1;
        } else if (sortVal === "oldest") {
            sort.listedAt = 1;
        } else {
            const parts = filters.sort.split(",").map(p => p.trim());
            if (parts.length >= 2) {
                let [column, direction] = parts;
                if (column === "available") column = "quantity";
                const dir = direction.toLowerCase();
                const sortOrder = (dir === "desc" || dir === "-1" || dir === "descending") ? -1 : 1;
                sort[column] = sortOrder;
            } else if (parts.length === 1 && parts[0]) {
                let column = parts[0];
                if (column === "available") column = "quantity";
                sort[column] = 1;
            }
        }
    }

    if (filters.listedDate) {
        const order = filters.listedDate.toLowerCase().trim();
        if (order === "latest") {
            sort.listedAt = -1;
        } else if (order === "oldest") {
            sort.listedAt = 1;
        }
    }

    // Default sort by latest if none provided
    if (Object.keys(sort).length === 0) {
        sort.listedAt = -1;
    }

    let cursor = productsCollection.find(query);
    if (Object.keys(sort).length > 0) {
        cursor = cursor.sort(sort);
    }

    // Handle pagination offset/skip and limit
    const offset = Number(filters.offset !== undefined ? filters.offset : filters.skip);
    if (!isNaN(offset) && offset > 0) {
        cursor = cursor.skip(offset);
    }

    const limit = Number(filters.limit);
    if (!isNaN(limit) && limit > 0) {
        cursor = cursor.limit(limit);
    }

    // If caller requests total count alongside, attach helper method
    cursor.countTotal = async () => {
        return await productsCollection.countDocuments(query);
    };

    return cursor;
}

// Converts a product document or Product instance to JSON-safe object
function toProductJSON(product) {
    return {
        _id: product._id,
        name: product.name,
        description: product.description,
        username: product.username,
        quantity: product.quantity !== undefined ? product.quantity : product.available,
        coverImage: product.coverImage,
        accessLevel: product.accessLevel,
        images: product.images,
        listedAt: product.listedAt
    };
}

module.exports = {
    normalizeProduct,
    validateProduct,
    toProductDoc,
    toProductJSON,
    createProduct,
    getProductById,
    getProduct
};