const { body, validationResult } = require("express-validator")
const { _allowed_users } = require("../config/constants")

const validation = [
    body("username")
        .notEmpty()
        .withMessage("Username is Required")
        .isLength({ min: 4 })
        .withMessage("Username is Too Short")
        .isLength({ max: 20 })
        .withMessage("Username is Too Long"),

    body("password")
        .notEmpty()
        .withMessage("Password is Required")
        .isLength({ min: 4 })
        .withMessage("Password is Too Short"),
]

const registerValidation = [
    ...validation,
    body("type")
        .notEmpty()
        .withMessage("User type is Required")
        .bail()
        .custom((value) => {
            const normalized = typeof value === "string" ? value.toLowerCase().trim() : ""
            if (!_allowed_users.includes(normalized)) {
                throw new Error(`Invalid user type. Allowed types: ${_allowed_users.join(", ")}`)
            }
            return true
        }),

    body("countryCode")
        .notEmpty()
        .withMessage("Country code is Required")
        .trim()
        .matches(/^\+?[0-9]{1,4}$/)
        .withMessage("Country code must be a valid format (e.g. +1, +91, 44)"),

    body("phoneNumber")
        .notEmpty()
        .withMessage("Phone number is Required")
        .trim()
        .matches(/^[0-9]{7,15}$/)
        .withMessage("Phone number must contain between 7 and 15 digits"),

    body("address")
        .notEmpty()
        .withMessage("Address is Required")
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage("Address must be between 5 and 200 characters"),

    body("email")
        .notEmpty()
        .withMessage("Email is Required")
        .trim()
        .isEmail()
        .withMessage("Must provide a valid Email address")
        .normalizeEmail()
]

function requestValidation(req, res, next) {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    next()
}

module.exports = {
    validation,
    registerValidation,
    requestValidation
}