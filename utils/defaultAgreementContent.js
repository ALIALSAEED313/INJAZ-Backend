/* Default Injaz Buyer & Seller Agreement v1.0 (spec section 2).
 * Used by POST /agreements/admin/seed-defaults. All 16 required sections. */
const title = "INJAZ BUYER & SELLER AGREEMENT";
const content = `INJAZ BUYER & SELLER AGREEMENT

Effective Date: [Date]

This Buyer & Seller Agreement establishes the rules governing transactions between buyers and sellers using the Injaz marketplace.

1. Acceptance of Terms
By creating an account, using marketplace services, purchasing a service, offering a service, or accepting an order, users acknowledge that they have read and agreed to the applicable Injaz terms and policies.

2. Buyer Responsibilities
Buyers agree to:
- Provide accurate project requirements.
- Provide necessary information and files required for the service.
- Communicate respectfully with sellers.
- Review submitted work within a reasonable period.
- Pay the agreed service price through the platform.
- Avoid requesting illegal, fraudulent, or prohibited work.

3. Seller Responsibilities
Sellers agree to:
- Provide accurate information about their services.
- Deliver the agreed work according to the agreed requirements.
- Respect the agreed delivery time.
- Communicate clearly with buyers.
- Provide original work or have the necessary rights to use submitted materials.
- Avoid offering illegal, fraudulent, misleading, or prohibited services.

4. Service Agreement
Each order may contain specific project details including:
- Service title
- Description
- Price
- Delivery time
- Deliverables
- Revisions
- Additional requirements
The specific order details form part of the agreement between the buyer and seller.

5. Payments
Payments must be processed through the Injaz platform where applicable.
Users must not attempt to bypass Injaz fees or platform payment procedures by moving transactions outside the platform when prohibited by Injaz policies.
6. Delivery
The seller is responsible for delivering the agreed work within the agreed timeframe unless both parties agree to a change.
Changes to requirements after an order begins may require additional time or payment.

7. Revisions
Revisions must remain within the number and scope agreed upon in the service listing or order.
Requests that substantially change the original requirements may be treated as a new requirement or additional service.

8. Cancellation and Refunds
Orders may be cancelled according to Injaz's cancellation and refund policies.
Refund decisions may depend on:
- Order status
- Work already completed
- Evidence provided by both parties
- Reason for cancellation
- Applicable Injaz policies

9. Disputes
If a disagreement occurs, buyers and sellers should first attempt to resolve the issue through Injaz's communication system.
If the dispute cannot be resolved, either party may request assistance from Injaz administration.
The admin may review relevant information, messages, order details, submitted work, and other available evidence before making a platform decision.

10. Intellectual Property
Unless otherwise agreed, ownership and usage rights relating to delivered work should be clearly established between the buyer and seller.
Users must not submit copyrighted, stolen, or unauthorized material.

11. Prohibited Activities
Users may not use Injaz for:
- Illegal activities
- Fraud or scams
- Harassment
- Impersonation
- Copyright infringement
- Sale of prohibited goods or services
- Malicious software
- Attempts to steal personal or financial information
- Any activity prohibited by Injaz policies or applicable law

12. Platform Rights
Injaz may:
- Remove prohibited services or content.
- Suspend or restrict accounts that violate platform rules.
- Cancel orders in accordance with platform policies.
- Investigate reported violations.
- Take appropriate action when there is evidence of abuse, fraud, or policy violations.

13. Privacy
Users must respect the privacy and confidentiality of information shared during a transaction.
Personal information obtained through Injaz must not be misused, sold, or shared without appropriate authorization.

14. Electronic Acceptance
Users may accept this agreement electronically.
The system records: user ID, agreement version, acceptance date and time, agreement type, IP address where legally appropriate and permitted, and acceptance status.

15. Changes to the Agreement
Injaz may update this agreement from time to time.
When a new version is published, the system retains the previous version.
If re-acceptance is required, users are prompted to review and accept the new version before continuing with affected marketplace activities.

16. Governing Law
This agreement is governed by the laws of the Kingdom of Bahrain, without regard to conflict-of-law principles. Any dispute arising under this agreement shall be subject to the competent courts of Bahrain.

IMPORTANT NOTICE: This document is a platform policy template. It is NOT legal advice and its publication does NOT make it legally valid for your jurisdiction. Have it reviewed by a qualified legal professional before production use.`;
module.exports = { title, content };