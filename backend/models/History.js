class History {
    constructor(username, event, date = new Date(), summaryShort = "", summaryLong = "", _id = undefined) {
        if (_id) {
            this._id = _id;
        }
        this.username = username;
        this.event = event;
        this.date = date instanceof Date ? date : new Date(date || Date.now());
        this.summaryShort = summaryShort;
        this.summaryLong = summaryLong;
    }
}

module.exports = History;
