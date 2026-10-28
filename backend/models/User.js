class User {
    constructor(username, password, type, phoneNumber, countryCode, address, email, _id = undefined, isAdmin = false, verified = false) {
        this._id = _id
        this.username = username
        this.password = password
        this.type = type
        this.phoneNumber = phoneNumber
        this.countryCode = countryCode
        this.address = address
        this.email = email
        this.isAdmin = isAdmin
        this.verified = verified
    }
}

module.exports = User
