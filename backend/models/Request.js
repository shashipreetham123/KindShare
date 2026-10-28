class Request {
    constructor(productId, beneficiaryUsername, donorUsername, quantity = 1) {
        this.status = "request"
        this.productId = productId
        this.beneficiaryUsername = beneficiaryUsername
        this.donorUsername = donorUsername
        this.quantity = quantity
        this.requestedOn = new Date()
    }
}

module.exports = Request