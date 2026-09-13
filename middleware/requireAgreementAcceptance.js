function gate(req, res, next) {
  // Marketplace gate (spec §3). Admins bypass so they can manage drafts.
  // Models are lazy-required to avoid circular imports at boot.
  const AgreementModel = require("../models/Agreement");
  const AgreementAcceptanceModel = require("../models/AgreementAcceptance");
  (async () => {
    try {
      // verifyToken only carries {_id, username}; role must be looked up.
      const User = require("../models/User");
      const dbUser = req.user?._id ? await User.findById(req.user._id).select("role") : null;
      if (dbUser && dbUser.role === "admin") return next();
      const agreement = await AgreementModel.findOne({ status: "Published", effectiveDate: { $lte: new Date() } }).sort({ effectiveDate: -1, updatedAt: -1 });
      if (!agreement || !agreement.requiresAcceptance) return next();
      const accepted = await AgreementAcceptanceModel.exists({ user: req.user._id, agreement: agreement._id });
      if (accepted) return next();
      return res.status(403).json({ message: "Please review and accept the current Buyer & Seller Agreement before continuing.", agreementRequired: true, agreement });
    } catch (err) { return next(err); }
  })();
}
module.exports = gate;