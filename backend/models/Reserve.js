const Request = require("./Request")

class Reserve {
    // Initializes a new reservation from a request and optional quantity
    constructor(request, quantity = undefined) {
        this.productId = request.productId
        this.beneficiaryUsername = request.beneficiaryUsername
        this.donorUsername = request.donorUsername
        this.quantity = quantity !== undefined ? quantity : (request.quantity !== undefined ? request.quantity : 1)
        this.requestedOn = request.requestedOn
        this.reservedOn = new Date()
    }
}

module.exports = Reserve