const Agreement = require("../models/Agreement");
const AgreementAcceptance = require("../models/AgreementAcceptance");

const currentAgreement = () => Agreement.findOne({ status: "Published", effectiveDate: { $lte: new Date() } }).sort({ effectiveDate: -1, updatedAt: -1 });
const clientIp = req => (req.ip || req.socket?.remoteAddress || "").slice(0, 100);

// Wrap async handlers so errors return JSON instead of crashing Express 5.
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function getCurrent(req, res, next) {
  try {
    const agreement = await currentAgreement();
    if (!agreement) return res.status(404).json({ message: "No published buyer and seller agreement is available." });
    return res.json({ agreement });
  } catch (err) { next(err); }
}
const getMyStatus = asyncHandler(async (req, res) => {
  const agreement = await currentAgreement();
  if (!agreement) return res.json({ agreement: null, acceptance: null, requiresAcceptance: false });
  const acceptance = await AgreementAcceptance.findOne({ user: req.user._id, agreement: agreement._id });
  return res.json({ agreement, acceptance, requiresAcceptance: agreement.requiresAcceptance && !acceptance });
});
// Spec §6 Settings → Legal & Agreements: full history, never deleted.
const getMyHistory = asyncHandler(async (req, res) => {
  const history = await AgreementAcceptance.find({ user: req.user._id })
    .populate("agreement", "title version status effectiveDate")
    .sort({ acceptedAt: -1 });
  return res.json({ history });
});
// Spec §6/§7: fetch any historical version (e.g. order's snapshot).
// Drafts stay admin-only; this route sits behind verifyToken so req.user exists.
const getById = asyncHandler(async (req, res) => {
  const User = require("../models/User");
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ message: "Agreement not found." });
  if (agreement.status === "Draft") {
    const user = req.user?._id ? await User.findById(req.user._id).select("role") : null;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "This agreement version is not available." });
    }
  }
  return res.json({ agreement });
});
async function acceptCurrent(req, res, next) {
  try {
  const agreement = await currentAgreement();
  if (!agreement) return res.status(404).json({ message: "No published agreement is available." });
  if (req.body.agreementId && String(req.body.agreementId) !== String(agreement._id)) return res.status(409).json({ message: "This is no longer the current agreement. Please review the latest version." });
  const acceptance = await AgreementAcceptance.findOneAndUpdate(
    { user: req.user._id, agreement: agreement._id },
    { $setOnInsert: { version: agreement.version, acceptanceMethod: "web", agreementType: agreement.agreementType || "buyer-seller", status: "accepted", ipAddress: clientIp(req), userAgent: req.get("user-agent") || "" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return res.status(201).json({ acceptance, agreement });
  } catch (err) { next(err); }
}
async function listAgreements(req, res, next) {
  try { res.json({ agreements: await Agreement.find().sort({ effectiveDate: -1, createdAt: -1 }) }); }
  catch (err) { next(err); }
}
async function getAdminById(req, res, next) {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: "Agreement not found." });
    const acceptanceCount = await AgreementAcceptance.countDocuments({ agreement: agreement._id });
    return res.json({ agreement, acceptanceCount });
  } catch (err) { next(err); }
}
async function createAgreement(req, res, next) {
  try {
  const { title, content, version, effectiveDate, requiresAcceptance = true, agreementType = "buyer-seller" } = req.body;
  if (!title || !content || !version || !effectiveDate) return res.status(400).json({ message: "Title, content, version and effective date are required." });
  if (await Agreement.exists({ version: String(version).trim() })) {
    return res.status(409).json({ message: "An agreement with this version already exists. Use a new version number." });
  }
  const agreement = await Agreement.create({ title, content, version: String(version).trim(), effectiveDate, requiresAcceptance, agreementType, createdBy: req.user._id });
  res.status(201).json({ agreement });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An agreement with this version already exists." });
    next(err);
  }
}
async function updateAgreement(req, res, next) {
  try {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ message: "Agreement not found." });
  if (agreement.status !== "Draft") return res.status(409).json({ message: "Published or archived versions are immutable. Create a new draft version instead." });
  if (req.body.version && String(req.body.version).trim() !== agreement.version) {
    if (await Agreement.exists({ version: String(req.body.version).trim(), _id: { $ne: agreement._id } })) {
      return res.status(409).json({ message: "An agreement with this version already exists." });
    }
  }
  ["title", "content", "version", "effectiveDate", "requiresAcceptance", "agreementType"].forEach(key => { if (req.body[key] !== undefined) agreement[key] = req.body[key]; });
  await agreement.save(); res.json({ agreement });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An agreement with this version already exists." });
    next(err);
  }
}
// Spec §1/§5: clone any version into a fresh Draft ("Create new versions").
async function createNewVersion(req, res, next) {
  try {
    const source = await Agreement.findById(req.params.id);
    if (!source) return res.status(404).json({ message: "Agreement not found." });
    const version = String(req.body.version || "").trim();
    if (!version) return res.status(400).json({ message: "A new version number is required." });
    if (await Agreement.exists({ version })) {
      return res.status(409).json({ message: "An agreement with this version already exists." });
    }
    const draft = await Agreement.create({
      title: req.body.title || source.title,
      content: req.body.content || source.content,
      version,
      status: "Draft",
      effectiveDate: req.body.effectiveDate || new Date(),
      requiresAcceptance: req.body.requiresAcceptance ?? source.requiresAcceptance,
      agreementType: source.agreementType || "buyer-seller",
      createdBy: req.user._id,
    });
    res.status(201).json({ agreement: draft });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An agreement with this version already exists." });
    next(err);
  }
}
async function publishAgreement(req, res, next) {
  try {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ message: "Agreement not found." });
  if (agreement.status === "Archived") return res.status(409).json({ message: "Archived versions cannot be published." });
  // Spec §5: only one active published version — archive the rest, keep history.
  await Agreement.updateMany({ status: "Published", _id: { $ne: agreement._id } }, { $set: { status: "Archived" } });
  agreement.status = "Published"; await agreement.save(); res.json({ agreement });
  } catch (err) { next(err); }
}
async function unpublishAgreement(req, res, next) {
  try {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ message: "Agreement not found." });
  if (agreement.status === "Published") { agreement.status = "Archived"; await agreement.save(); }
  res.json({ agreement });
  } catch (err) { next(err); }
}
// ---- Admin: seed the spec §2 default content as a Draft (idempotent) ----
// Gives the admin a one-click "Load default content" starting point containing
// all 16 required sections. Never duplicates: returns the existing v1.0.
const seedDefaults = asyncHandler(async (req, res) => {
  const existing = await Agreement.findOne({ version: "1.0" });
  if (existing) return res.json({ agreement: existing, seeded: false });
  const { title, content } = require("../utils/defaultAgreementContent");
  const draft = await Agreement.create({
    title,
    content,
    version: "1.0",
    status: "Draft",
    effectiveDate: new Date(),
    requiresAcceptance: true,
    agreementType: "buyer-seller",
    createdBy: req.user._id,
  });
  res.status(201).json({ agreement: draft, seeded: true });
});

module.exports = { getCurrent, getById, getMyStatus, getMyHistory, acceptCurrent, listAgreements, getAdminById, createAgreement, createNewVersion, updateAgreement, publishAgreement, unpublishAgreement, seedDefaults };
