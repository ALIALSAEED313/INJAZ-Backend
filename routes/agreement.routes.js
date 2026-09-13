const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const isAdmin = require("../middleware/isAdmin");
const c = require("../controllers/agreement.controller");
// Public: current published agreement.
router.get("/current", c.getCurrent);
router.use(verifyToken);
// Authenticated: status/accept/history + historical snapshot by id
// (getById hides Drafts from non-admins; order snapshots are Published/Archived).
router.get("/by-id/:id", c.getById);
router.get("/my-status", c.getMyStatus);
router.get("/my-history", c.getMyHistory);
router.post("/accept", c.acceptCurrent);
// Admin-only: every /admin route additionally requires isAdmin.
router.get("/admin", isAdmin, c.listAgreements);
router.get("/admin/:id", isAdmin, c.getAdminById);
router.post("/admin", isAdmin, c.createAgreement);
router.post("/admin/seed-defaults", isAdmin, c.seedDefaults);
router.put("/admin/:id", isAdmin, c.updateAgreement);
router.post("/admin/:id/new-version", isAdmin, c.createNewVersion);
router.post("/admin/:id/publish", isAdmin, c.publishAgreement);
router.post("/admin/:id/unpublish", isAdmin, c.unpublishAgreement);
module.exports = router;
