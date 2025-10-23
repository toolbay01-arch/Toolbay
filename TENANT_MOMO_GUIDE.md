# MoMo Payment Configuration Guide for Tenants

## 📱 What is a MoMo Code?

A **MoMo Code** is a unique integer identifier for your business that customers will use when paying via MTN Mobile Money. This code is configured by you (or the super admin) in your tenant settings.

---

## 🔧 How to Configure Your MoMo Code

### Step 1: Access Admin Panel
1. Log in to your account
2. Navigate to `/admin`
3. Click on **Collections** → **Tenants**
4. Select your store

### Step 2: Configure Payment Settings

Find the **Payment Method** section and configure:

#### **Required Fields:**

1. **Payment Method**: Select "Mobile Money (MOMO)"

2. **MoMo Code** (Required)
   - **Format**: Integer number (e.g., `828822`, `123456`, `999001`)
   - **Rules**: 
     - Must be unique across all tenants
     - Must be a valid integer
     - Typically 6 digits
   - **Example**: `828822`, `123456`, `555777`

3. **MoMo Account Name** (Optional but recommended)
   - Your business name as registered with MTN
   - This shows to customers for verification
   - **Example**: "Lionel's Electronics", "Tech Shop Rwanda"

4. **MoMo Pay Code** (Optional - for reference)
   - Your registered MTN MoMo merchant code if you have one
   - This is different from the MoMo Code above

---

## 💰 How Customers Will Pay

Once configured, your customers will see this payment instruction:

```
┌──────────────────────────────────────┐
│ Complete Your Payment                │
│                                      │
│ 📱 Dial on MTN Phone:               │
│    *182*8*1*MOMOCODE*AMOUNT#        │
│                                      │
│ Example:                             │
│    *182*8*1*828822*25000#           │
│                                      │
│ 💰 Amount: 25,000 RWF              │
│ 🔑 Reference: PAY1AB2C3D4E         │
│                                      │
│ After payment, enter the            │
│ Transaction ID from your SMS        │
└──────────────────────────────────────┘
```

### Payment Flow:

1. **Customer adds products to cart** (Total: 25,000 RWF)
2. **Customer clicks Checkout**
3. **System shows dial code**: `*182*8*1*828822*25000#`
   - `828822` = Your MoMo Code (integer)
   - `25000` = Total cart amount
4. **Customer dials on MTN phone** and enters PIN
5. **Customer receives SMS** with Transaction ID
6. **Customer enters Transaction ID** on website
7. **You verify payment** in admin panel

---

## ✅ Verifying Payments (Your Job)

### Step 1: Access Verification Page
- Navigate to `/admin/verify-payments`
- You'll see a list of transactions awaiting verification

### Step 2: Check Your MTN SMS
Open your MTN Mobile Money SMS messages and find:
```
MTN MoMo Receipt
Transaction ID: MP241021.1234.A56789
Amount: 25,000 RWF
From: 0788123456
Date: 22 Oct 2025, 14:30
```

### Step 3: Match & Verify
In the admin panel you'll see:
- **Customer Name**: John Doe
- **Amount**: 25,000 RWF
- **Transaction ID**: MP241021.1234.A56789

**If it matches your SMS:**
1. Click **"Verify"** button
2. Confirm the Transaction ID
3. System automatically:
   - Creates the order
   - Updates your revenue (25,000 - 10% = 22,500 RWF)
   - Notifies customer

**If it doesn't match:**
1. Click **"Reject"** button
2. Enter reason (e.g., "Amount doesn't match", "No SMS received")
3. Customer will be notified to retry

---

## 💸 Revenue Tracking

### Platform Fee: 10%
- Customer pays: **25,000 RWF**
- Platform fee: **2,500 RWF** (10%)
- You receive: **22,500 RWF** (90%)

### Revenue Display
Your **Total Revenue** field in admin panel shows:
- Cumulative amount you've earned (after platform fees)
- Updated automatically after each verified payment
- **Example**: 5 sales of 25,000 RWF each = 112,500 RWF total revenue

---

## ⚠️ Important Notes

### DO:
✅ Check your MTN SMS before verifying
✅ Verify amount matches exactly
✅ Verify transaction ID matches your SMS
✅ Verify within 48 hours (transactions expire)
✅ Keep your MoMo Code simple and memorable

### DON'T:
❌ Don't verify without checking SMS
❌ Don't share your MoMo Code with competitors
❌ Don't change MoMo Code frequently (confuses customers)
❌ Don't verify expired transactions (>48 hours old)
❌ Don't use spaces or special characters in MoMo Code

---

## 🆘 Troubleshooting

### Customer says "Payment method not configured"
**Solution**: Make sure you've:
1. Set Payment Method to "Mobile Money (MOMO)"
2. Entered a unique MoMo Code
3. Saved the changes

### I don't see transactions to verify
**Check:**
- Have customers completed checkout?
- Did they submit their Transaction ID?
- Are you looking in `/admin/verify-payments`?

### Transaction expired before I could verify
**Solution**: 
- Transactions expire after 48 hours
- Customer needs to checkout again
- Verify payments promptly

### Customer's Transaction ID doesn't match my SMS
**Action**: Reject the payment with reason
- Customer may have entered wrong ID
- Ask customer to check their SMS again
- If persists, customer should retry payment

---

## 📞 Support

If you need help:
1. Contact platform support
2. Email: support@toolboxx.com
3. WhatsApp: +250 788 123 456

---

## 🎯 Quick Reference

| Field | Description | Example |
|-------|-------------|---------|
| **MoMo Code** | Your unique payment identifier | `LIONEL01` |
| **Dial Code Format** | Customer dials this | `*182*8*1*CODE*AMOUNT#` |
| **Transaction ID** | From MTN SMS | `MP241021.1234.A56789` |
| **Platform Fee** | Automatic deduction | 10% |
| **Your Share** | What you receive | 90% |
| **Expiry** | Transaction timeout | 48 hours |

---

**Last Updated:** October 22, 2025
**System Version:** 1.0
