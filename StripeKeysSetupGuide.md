# Stripe Keys Setup Guide

## Overview
This document summarizes the process to obtain all necessary Stripe keys for development, including API keys and webhook secrets.

## 1. Stripe API Keys (From Dashboard)

### Publishable Key
```
pk_test_51RSlvhQNXfgJjmVmbxbORXTE4HHf9lBjtnokeXxem6ZaWlTO8Ifhti9MMc2N4wdCEOIGbjNZudVwVp6WdWDOljXE00WIlFINpT
```

### Secret Key
```
sk_test_51RSlvhQNXfgJjmVmcxDVOhMuaDDWalu5oRhb00tNkU4lVwd0ZXG8FhQf51qWrS0gxaSDSSaXcSrk1xsIofQWdr0d00cQUbS90h
```

⚠️ **SECURITY WARNING**: The secret key above was shared publicly and should be regenerated immediately!

### How to get API Keys:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy the publishable key (safe to share)
4. Reveal and copy the secret key (keep private!)

## 2. Stripe CLI Installation (Linux)

### Download and Install
```bash
# Download the correct version
wget https://github.com/stripe/stripe-cli/releases/download/v1.30.0/stripe_1.30.0_linux_x86_64.tar.gz

# Extract
tar -xvf stripe_1.30.0_linux_x86_64.tar.gz

# Install to PATH
sudo mv stripe /usr/local/bin/

# Verify installation
stripe --version
```

## 3. Stripe CLI Authentication

### Login Process
```bash
stripe login
```

**Results:**
- Pairing code: `plush-attune-excel-lush`
- Account ID: `acct_1RSlvhQNXfgJjmVm`
- Authentication expires after 90 days

## 4. Webhook Secret Generation

### Start Webhook Forwarding
```bash
stripe listen --forward-to localhost:4242/webhook
```

**Generated Webhook Secret:**
```
whsec_da810d29c67c2955ae27246f4d3f2566eb2eedbe4570e478c6ebda9285a447d5
```

### API Version Used
```
2025-04-30.basil
```

## 5. Complete Development Setup

### Terminal 1: Webhook Forwarding
```bash
stripe listen --forward-to localhost:4242/webhook
```

### Terminal 2: Ruby Server
```bash
cd ~/Desktop/MultTenant/stripe-sample-code/
export STRIPE_WEBHOOK_SECRET=whsec_da810d29c67c2955ae27246f4d3f2566eb2eedbe4570e478c6ebda9285a447d5
bundle install
ruby server.rb -o 0.0.0.0
```

### Terminal 3: Testing
```bash
stripe trigger payment_intent.succeeded
```

## 6. Environment Variables Summary

For your application, set these environment variables:

```bash
# API Keys
export STRIPE_PUBLISHABLE_KEY=pk_test_51RSlvhQNXfgJjmVmbxbORXTE4HHf9lBjtnokeXxem6ZaWlTO8Ifhti9MMc2N4wdCEOIGbjNZudVwVp6WdWDOljXE00WIlFINpT
export STRIPE_SECRET_KEY=sk_test_[NEW_REGENERATED_KEY]

# Webhook Secret (changes each time you restart stripe listen)
export STRIPE_WEBHOOK_SECRET=whsec_da810d29c67c2955ae27246f4d3f2566eb2eedbe4570e478c6ebda9285a447d5
```

## 7. Important Security Notes

- ✅ Publishable key (`pk_test_...`) - Safe to expose in frontend code
- ❌ Secret key (`sk_test_...`) - **Never share publicly, regenerate the compromised one!**
- ✅ Webhook secret (`whsec_...`) - Used for webhook verification, keep secure
- 🔄 Webhook secret changes each time `stripe listen` is restarted
- ⏰ CLI authentication expires after 90 days

## 8. File Locations

- **Project Directory**: `~/Desktop/MultTenant/next15-multitenant-ecommerce-master`
- **Stripe Sample Code**: `~/Desktop/MultTenant/stripe-sample-code/`
- **Stripe CLI Binary**: `/usr/local/bin/stripe`

## 9. Next Steps

1. **IMMEDIATELY** regenerate the secret key from Stripe Dashboard
2. Update your application with the new secret key
3. Test webhook functionality with `stripe trigger` commands
4. Implement proper webhook handling in your application

---

**Last Updated**: August 29, 2025  
**Stripe CLI Version**: v1.30.0  
**API Version**: 2025-04-30.basil
