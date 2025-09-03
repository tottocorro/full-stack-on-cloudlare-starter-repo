import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

App.get('/click-socket', async (c) => {
  console.log("client socket")
  const upgradeHeader = c.req.header('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return c.text('Expected Upgrade: websocket', 426);
	}

  const accountId = c.req.header('account-id')
  if (!accountId) return  c.text('No Headers', 404);
  const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId);
	const stub = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId);
  return await stub.fetch(c.req.raw)
})

App.get('/:id', async (c) => {
    const id = c.req.param('id');

    const linkInfo = await getRoutingDestinations(c.env, id)
    if (!linkInfo) {
      return c.text('Destination not found', 404);
    }

    const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf)
    if (!cfHeader.success) {
		  return c.text('Invalid Cloudflare headers', 400);
    }

    const destination = getDestinationForCountry(linkInfo, cfHeader.data.country)

    const linkClickMessage: LinkClickMessageType = {
      "type": "LINK_CLICK",
      data: {
        id: id,
        country: cfHeader.data.country,
        destination: destination,
        accountId: linkInfo.accountId,
        latitude: cfHeader.data.latitude,
        longitude: cfHeader.data.longitude,
        timestamp: new Date().toISOString()
      }
    }
    c.executionCtx.waitUntil(
      captureLinkClickInBackground(c.env, linkClickMessage)
    )
    return c.redirect(destination)
})




