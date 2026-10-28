const _allowed_users = ["individual", "business", "organization"]

const user_type = {
    individual: "individual",
    business: "business",
    organization: "organization"
}

const access_level = {
    individualOnly: 1,
    organizationOnly: 2,
    businessOnly: 3,
    everyone: 4
}

module.exports = { _allowed_users, user_type, access_level }