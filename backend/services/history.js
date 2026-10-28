const { ObjectId } = require("mongodb");
const History = require("../models/History");

// Validates history data
function validateHistory(historyData) {
    const errors = [];

    if (!historyData) {
        return { isValid: false, errors: ["History data is required"] };
    }

    if (!historyData.username || typeof historyData.username !== "string" || historyData.username.trim().length === 0) {
        errors.push("Username is required");
    }

    if (!historyData.event || typeof historyData.event !== "string" || historyData.event.trim().length === 0) {
        errors.push("Event type is required");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Adds / logs a record into the history collection
async function addHistory({ username, event, date = new Date(), summaryShort = "", summaryLong = "" }, historyCollection) {
    if (!historyCollection) {
        return null;
    }

    const normalizedUsername = (username || "").toLowerCase().trim();
    const eventDate = date instanceof Date ? date : new Date(date || Date.now());

    const historyRecord = new History(
        normalizedUsername,
        event,
        eventDate,
        summaryShort || "",
        summaryLong || ""
    );

    const doc = {
        username: historyRecord.username,
        event: historyRecord.event,
        date: historyRecord.date,
        summaryShort: historyRecord.summaryShort,
        summaryLong: historyRecord.summaryLong
    };

    const result = await historyCollection.insertOne(doc);
    if (result.acknowledged && result.insertedId) {
        historyRecord._id = result.insertedId;
    }

    return historyRecord;
}

// Retrieves history records matching the given filters, sorted newest to oldest
async function getHistory(filter = {}, historyCollection) {
    if (!historyCollection) {
        return [];
    }

    const query = {};

    if (filter.username) {
        query.username = filter.username.toLowerCase().trim();
    }

    if (filter.event) {
        if (typeof filter.event === "string") {
            query.event = { $regex: new RegExp(filter.event, "i") };
        } else {
            query.event = filter.event;
        }
    }

    if (filter.startDate || filter.endDate) {
        query.date = {};
        if (filter.startDate) {
            query.date.$gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
            query.date.$lte = new Date(filter.endDate);
        }
    }

    let cursor = historyCollection.find(query).sort({ date: -1 });

    if (filter.offset !== undefined && filter.offset !== null && !isNaN(Number(filter.offset))) {
        cursor = cursor.skip(Math.max(0, parseInt(filter.offset, 10)));
    }

    if (filter.limit !== undefined && filter.limit !== null && !isNaN(Number(filter.limit))) {
        const lim = parseInt(filter.limit, 10);
        if (lim > 0) {
            cursor = cursor.limit(lim);
        }
    }

    const docs = await cursor.toArray();

    return docs.map(doc => new History(
        doc.username,
        doc.event,
        doc.date,
        doc.summaryShort,
        doc.summaryLong,
        doc._id
    ));
}

// Converts a History record or object to formatted JSON
function toHistoryJSON(history, includeSummaryLong = true) {
    const json = {
        _id: history._id,
        username: history.username,
        event: history.event,
        date: history.date,
        summaryShort: history.summaryShort
    };

    if (includeSummaryLong) {
        json.summaryLong = history.summaryLong;
    }

    return json;
}

module.exports = {
    validateHistory,
    addHistory,
    logHistory: addHistory,
    getHistory,
    toHistoryJSON
};
