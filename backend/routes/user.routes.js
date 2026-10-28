const express = require("express")
const { checkAuth } = require("../middleware/auth")
const productRoutes = require("./user/product.routes")
const requestRoutes = require("./user/request.routes")
const reserveRoutes = require("./user/reserve.routes")
const completedRoutes = require("./user/completed.routes")
const historyRoutes = require("./user/history.routes")

const router = express.Router()

router.use(checkAuth)

router.get("/me", (req, res) => {
    res.status(200).json({
        message: "User Profile",
        user: req.user
    })
})

router.use("/product", productRoutes)
router.use("/request", requestRoutes)
router.use("/reserve", reserveRoutes)
router.use("/completed", completedRoutes)
router.use("/history", historyRoutes)

module.exports = router
