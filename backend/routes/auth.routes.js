const express = require("express")

const router = express.Router()

const { getUserByUsername, verifyPassword, userExists, createUser } = require("../services/user")
const { validation, registerValidation, requestValidation } = require("../middleware/validation")
const { handleServerError } = require("../services/common")

router.post("/login", validation, requestValidation, async (req, res) => {
    try {
        const { username, password } = req.body

        const db = req.app.locals.db
        const users = db.collection("users")

        const user = await getUserByUsername(username, users)

        if (!user) {
            return res.status(404).json({
                message: "User not Found. Authentication Failed",
                data: null
            })
        }

        const isValid = await verifyPassword(user.password, password)

        if (isValid) {
            req.session.username = user.username;

            return res.status(200).json({
                message: "Login Successful",
                data: {
                    username: user.username,
                    isAdmin: !!user.isAdmin
                }
            })
        } else {
            return res.status(401).json({
                message: "Username or Password is Incorrect. Authentication Failed",
                data: null
            })
        }

    } catch (err) {
        return handleServerError(res, err, "Authentication Failed")
    }
})

router.post("/register", registerValidation, requestValidation, async (req, res) => {
    try {
        const { username, password, type, phoneNumber, countryCode, address, email } = req.body

        const db = req.app.locals.db
        const users = db.collection("users")

        const exists = await userExists(username, users)

        if (exists) {
            return res.status(400).json({
                message: `User with Username ${username.toLowerCase().trim()} Already Exists.`,
                data: null
            })
        }

        const user = await createUser({ username, password, type, phoneNumber, countryCode, address, email }, users)

        if (!user) {
            return res.status(400).json({
                message: "Unable to Create Account. "
            })
        }

        return res.status(201).json({
            message: "User Created Successfully",
            data: {
                username: user.username,
            }
        })

    } catch (error) {
        return handleServerError(res, error, "Unable to Create User")
    }
})

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        });

        res.json({
            message: "Logged out successfully"
        });
    });
});
module.exports = router