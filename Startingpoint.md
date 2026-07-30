name: gov-contract-broker
description: Automates government contract partnership origination/Identification by scanning SAM.gov/USASpending or SAM.gov/USASpending API's for recent awards, identifying awardees, sending partnership outreach emails, and matching them with subcontractors for a commission. Use when a user asks to find government contracts, broker subcontracts, or reach out to government contract winners.
---

# Government Contract Broker

This skill provides a complete workflow for automating government contract partnership origination. It enables Manus to act as a broker by identifying recent contract awardees, reaching out to them to propose a teaming agreement, and matching them with capable subcontractors while taking a commission.

## Workflow Overview

The brokering process involves four sequential phases:

1. **Award Discovery:** Scan SAM.gov/USASpending and SAM.gov/USASpending API's for recently awarded contracts in target industries.
2. **Awardee Outreach:** Extract awardee contact information and send personalized partnership emails.
3. **Subcontractor Matching:** When an awardee responds positively, find and qualify subcontractors capable of fulfilling the contract requirements.
4. **Deal Structuring:** Draft a Teaming Agreement or Subcontract that secures a commission for the brokering service.

---

## Phase 1: Award Discovery

To find recent government contract awards, use the SAM.gov/USASpending Opportunities API or SAM.gov/USASpending API's.

### Target Identification

Focus on service-based contracts where subcontracting is common. Target these NAICS codes:

- `541219` - Other Accounting Services
- `541511` - Custom Computer Programming Services
- `541512` - Computer Systems Design Services
- `541611` - Administrative Management and General Management Consulting Services
- `561320` - Temporary Help Services (Staffing)
- `488510` - Freight Transportation Arrangement (Logistics)

### Data Retrieval

Use the `search` tool with `type=api` or write a Python script to query the SAM.gov/USASpending API's. (`https://api.usaspending.gov/api/v2/awards/`) for recent awards. Filter for contracts awarded within the last 30-90 days.

Extract the following key data points for each award:

- Contract Title / Description
- Award Amount
- Awarding Agency
- Awardee Name (Prime Contractor)
- Awardee Contact Information (Email, Phone, Point of Contact)

---

## Phase 2: Awardee Outreach

Once awardees are identified, the next step is to initiate contact and propose a partnership.

### Outreach Strategy

The goal is to position the user as a valuable partner who can provide qualified subcontractors to help the prime contractor fulfill the contract efficiently, reducing their operational burden.

### Email Template

Use the following template for outreach emails. Customize the bracketed fields based on the extracted award data.



Subject: Partnership Inquiry: Subcontracting Support for [Contract Title]

Hi [Point of Contact Name or "Team"],

Congratulations on recently being awarded the [Contract Title] contract with the [Awarding Agency].

We specialize in connecting prime contractors with highly qualified, pre-vetted subcontractors in the [Industry/Service] space. We understand that fulfilling federal contracts often requires rapidly scaling your workforce or bringing in specialized expertise.

We have a network of capable subcontractors ready to deploy for this specific requirement. We handle the sourcing, vetting, and initial matching, allowing you to focus on managing the overall contract delivery.

Would you be open to a brief 10-minute call next week to discuss how we can support your fulfillment of this contract?

Best regards,
[User's Name]
[User's Title]
[User's Company/Contact Info]


*Note: Use the `message` tool to ask the user for permission or to configure an email integration before sending actual emails.*

---

## Phase 3: Subcontractor Matching

When an awardee responds positively, immediately begin the subcontractor matching process.

1. **Requirement Analysis:** Review the original contract solicitation to understand the exact scope of work, required certifications (e.g., security clearances, ISO certifications), and performance locations.
2. **Subcontractor Sourcing:** Use the `search` tool to find businesses in the relevant industry. Look for companies that explicitly mention government contracting experience or hold relevant set-aside statuses (e.g., SDVOSB, WOSB, 8(a)).
3. **Qualification:** Evaluate potential subcontractors based on their past performance, capacity, and alignment with the contract requirements.

---

## Phase 4: Deal Structuring & Commission

The final step is to formalize the relationship and secure the commission.
