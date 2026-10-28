const express = require("express");
const { checkAdminAuth } = require("../middleware/auth");

const userRoutes = require("./admin/user.routes");
const productRoutes = require("./admin/product.routes");
const requestRoutes = require("./admin/request.routes");
const reserveRoutes = require("./admin/reserve.routes");
const historyRoutes = require("./admin/history.routes");

const router = express.Router();

router.use(checkAdminAuth);

// Admin Profile
router.get("/me", (req, res) => {
    return res.status(200).json({
        message: "Admin Profile",
        user: req.user
    });
});

// Modular sub-routers for admin operations
router.use("/user", userRoutes);
router.use("/users", userRoutes); // Support both /user and /users

router.use("/product", productRoutes);
router.use("/products", productRoutes); // Support both /product and /products

router.use("/request", requestRoutes);
router.use("/requests", requestRoutes); // Support both /request and /requests

router.use("/reserve", reserveRoutes);
router.use("/reserves", reserveRoutes); // Support both /reserve and /reserves

router.use("/history", historyRoutes);

module.exports = router;
