const { access_level } = require("../config/constants")

class Product {
    constructor(name, description, username, quantity, coverImage, accessLevel = access_level.everyone, images = [], listedAt = new Date(), _id = undefined) {
        this._id = _id
        this.name = name
        this.description = description
        this.username = username
        this.quantity = quantity
        this.coverImage = coverImage
        this.images = images
        this.accessLevel = accessLevel
        this.listedAt = listedAt
    }
}

module.exports = Product
