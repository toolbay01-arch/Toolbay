import type { Stripe } from "stripe";
import { getPayloadSingleton } from "@/lib/payload-singleton";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";

import { ExpandedLineItem } from "@/modules/checkout/types";

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get("stripe-signature") as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (error! instanceof Error) {
      console.log(error);
    }

    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }

  console.log("✅ Success:", event.id);

  const permittedEvents: string[] = [
    "checkout.session.completed",
    "account.updated"
  ];

  const payload = await getPayloadSingleton();

  if (permittedEvents.includes(event.type)) {
    let data;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          data = event.data.object as Stripe.Checkout.Session;

          if (!data.metadata?.userId) {
            throw new Error("User ID is required");
          }

          const user = await payload.findByID({
            collection: "users",
            id: data.metadata.userId,
          });

          if (!user) {
            throw new Error("User not found");
          }

          const expandedSession = await stripe.checkout.sessions.retrieve(
            data.id,
            {
              expand: ["line_items.data.price.product"],
            },
            {
              stripeAccount: event.account,
            },
          );

          if (
            !expandedSession.line_items?.data ||
            !expandedSession.line_items.data.length
          ) {
            throw new Error("No line items found");
          }

          const lineItems = expandedSession.line_items.data as ExpandedLineItem[];

          for (const item of lineItems) {
            await payload.create({
              collection: "orders",
              data: {
                // Legacy Stripe webhook - creating minimal order
                user: user.id,
                product: item.price.product.metadata.id,
                products: [{
                  product: item.price.product.metadata.id,
                  quantity: 1,
                  priceAtPurchase: item.amount_total || 0,
                }],
                name: item.price.product.name,
                orderNumber: `STRIPE-${data.id.slice(-8)}`,
                totalAmount: item.amount_total || 0,
                amount: item.amount_total || 0,
                transactionId: data.id,
                status: 'pending',
                paymentMethod: 'bank_transfer', // Legacy Stripe payments treated as bank transfer
                bankName: 'Stripe',
                accountNumber: 'N/A',
                currency: 'RWF',
                deliveryType: 'delivery', // Default to delivery for Stripe orders
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
            });
          }
          break;
        case "account.updated":
          data = event.data.object as Stripe.Account;

          // Legacy Stripe account update - no longer using Stripe
          // await payload.update({
          //   collection: "tenants",
          //   where: {
          //     stripeAccountId: {
          //       equals: data.id,
          //     },
          //   },
          //   data: {
          //     stripeDetailsSubmitted: data.details_submitted,
          //   },
          // });
          console.log('Stripe account updated (legacy):', data.id);

        break;
        default:
          throw new Error(`Unhandled event: ${event.type}`);
      }
    } catch (error) {
      console.log(error)
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Received" }, { status: 200 });
};
